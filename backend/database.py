import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database path: /app/data/mindfulflow.db inside docker container, or local fallback
DB_DIR = "/app/data" if os.path.exists("/app") else "."
os.makedirs(DB_DIR, exist_ok=True)
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    DB_DIR = "/app/data" if os.path.exists("/app") else "."
    os.makedirs(DB_DIR, exist_ok=True)
    DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'mindfulflow.db')}"

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}  # Needed for SQLite in multi-threaded FastAPI

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
