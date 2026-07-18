import os

class Settings:
    # App Settings
    APP_TITLE: str = "MindfulFlow API"
    APP_DESCRIPTION: str = "GenAI Habit Breaking & Coaching Backend"
    
    # CORS Origins
    ALLOWED_ORIGINS: str = os.environ.get(
        "ALLOWED_ORIGINS", 
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
    )
    
    # Rate Limits
    RATE_LIMIT_AI_MAX: int = int(os.environ.get("RATE_LIMIT_AI_MAX", "10"))
    RATE_LIMIT_AI_WINDOW: int = int(os.environ.get("RATE_LIMIT_AI_WINDOW", "60"))
    RATE_LIMIT_CRUD_MAX: int = int(os.environ.get("RATE_LIMIT_CRUD_MAX", "45"))
    RATE_LIMIT_CRUD_WINDOW: int = int(os.environ.get("RATE_LIMIT_CRUD_WINDOW", "60"))
    
    # Database Settings
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    
    # Gemini API Settings
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

settings = Settings()
