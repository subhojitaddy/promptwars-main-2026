from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from dependencies import get_db, get_user_id

router = APIRouter(prefix="/logs", tags=["logs"])

@router.post("", response_model=schemas.CravingLogResponse, status_code=status.HTTP_201_CREATED)
def create_craving_log(
    log: schemas.CravingLogCreate, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    # Verify habit exists and belongs to the user
    habit = db.query(models.Habit).filter(
        models.Habit.id == log.habit_id,
        (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    db_log = models.CravingLog(
        user_id=user_id,
        habit_id=log.habit_id,
        severity=log.severity,
        trigger_context=log.trigger_context,
        mood=log.mood,
        was_resisted=log.was_resisted,
        notes=log.notes
    )
    db.add(db_log)
    
    # If user slipped, reset current streak
    if not log.was_resisted:
        habit.streak = 0
        
    db.commit()
    db.refresh(db_log)
    return db_log

@router.get("", response_model=List[schemas.CravingLogResponse])
def get_craving_logs(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Retrieve all craving logs for analytics, isolated by user.
    """
    return db.query(models.CravingLog).filter(
        (models.CravingLog.user_id == user_id) | (models.CravingLog.user_id.is_(None))
    ).all()
