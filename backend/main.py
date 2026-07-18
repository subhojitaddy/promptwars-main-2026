from datetime import datetime, timezone
import os
import time
import json
import logging
from collections import defaultdict
from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

import database
import models
import gemini
from config import settings
from utils.logging import setup_logging
from dependencies import get_db

# Configure structured logging
setup_logging()
logger = logging.getLogger("mindfulflow.main")

app = FastAPI(
    title=settings.APP_TITLE, 
    description=settings.APP_DESCRIPTION
)

# --- SECURITY MIDDLEWARES ---

# 1. CORS Configuration
allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# 3. Payload Size Limiter (Max 1MB payload to prevent DOS)
class LimitUploadSizeMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_upload_size: int = 1_048_576):
        super().__init__(app)
        self.max_upload_size = max_upload_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            if int(content_length) > self.max_upload_size:
                return Response(
                    content="Request payload too large (max 1MB).", 
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE
                )
        return await call_next(request)

app.add_middleware(LimitUploadSizeMiddleware)

# 4. In-Memory Sliding Window Rate Limiter
class RateLimiter:
    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        # Prune expired timestamps
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < self.window_seconds]
        if len(self.requests[client_ip]) >= self.requests_limit:
            return False
        self.requests[client_ip].append(now)
        return True

ai_limiter = RateLimiter(
    requests_limit=settings.RATE_LIMIT_AI_MAX, 
    window_seconds=settings.RATE_LIMIT_AI_WINDOW
)
crud_limiter = RateLimiter(
    requests_limit=settings.RATE_LIMIT_CRUD_MAX, 
    window_seconds=settings.RATE_LIMIT_CRUD_WINDOW
)

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = "unknown"
        if request.client:
            client_ip = request.client.host
        # Inspect proxy headers to get real client IP
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(",")[0].strip()
        else:
            x_real_ip = request.headers.get("x-real-ip")
            if x_real_ip:
                client_ip = x_real_ip
                
        path = request.url.path

        if path.startswith("/api/chat") or path.startswith("/api/grounding") or path.startswith("/api/nudge"):
            if not ai_limiter.is_allowed(client_ip):
                return Response(
                    content="Too many AI requests. Please slow down.", 
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS
                )
        elif path.startswith("/api") and not path.startswith("/api/health"):
            if not crud_limiter.is_allowed(client_ip):
                return Response(
                    content="Rate limit exceeded.", 
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS
                )
        return await call_next(request)

app.add_middleware(RateLimitMiddleware)

# Initialize database tables
models.Base.metadata.create_all(bind=database.engine)

# --- DEEP HEALTH CHECK ---
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        # Perform query to check if DB is responsive
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        
    gemini_ok = gemini.client is not None
    
    status_code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    
    health_status = {
        "status": "ok" if db_ok else "unhealthy",
        "database": "connected" if db_ok else "disconnected",
        "gemini_client": "initialized" if gemini_ok else "simulated_mode",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    return Response(
        content=json.dumps(health_status),
        status_code=status_code,
        media_type="application/json"
    )

# --- REGISTER ROUTERS ---
from routers import habits, logs, chat, grounding

app.include_router(habits.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(grounding.router, prefix="/api")
