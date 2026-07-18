from fastapi import Header
from sqlalchemy.orm import Session
import database
import logging

logger = logging.getLogger("mindfulflow.dependencies")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user_id(x_user_id: str = Header(default="default_user")) -> str:
    """
    Extracts the anonymous user session ID from the X-User-Id header.
    Defaults to 'default_user' for backwards compatibility.
    """
    if not x_user_id or x_user_id == "default_user":
        # We allow fallback to support existing clients/tests, but log it
        logger.debug("X-User-Id header is missing or default. Falling back to default_user.")
        return "default_user"
    return x_user_id
