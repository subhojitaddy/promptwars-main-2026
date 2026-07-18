from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List

import models
import schemas
from dependencies import get_db, get_user_id

router = APIRouter(prefix="/habits", tags=["habits"])

@router.post("", response_model=schemas.HabitResponse, status_code=status.HTTP_201_CREATED)
def create_habit(
    habit: schemas.HabitCreate, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    db_habit = models.Habit(
        user_id=user_id,
        name=habit.name,
        category=habit.category,
        target_description=habit.target_description
    )
    db.add(db_habit)
    db.commit()
    db.refresh(db_habit)
    return db_habit

@router.get("", response_model=List[schemas.HabitResponse])
def get_habits(
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    # Support backward compatibility for legacy rows with null user_id
    return db.query(models.Habit).filter(
        (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
    ).all()

@router.get("/{habit_id}", response_model=schemas.HabitDetailResponse)
def get_habit_detail(
    habit_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    habit = db.query(models.Habit).filter(
        models.Habit.id == habit_id,
        (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit

@router.delete("/{habit_id}")
def delete_habit(
    habit_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    habit = db.query(models.Habit).filter(
        models.Habit.id == habit_id,
        (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    db.delete(habit)
    db.commit()
    return {"detail": "Habit deleted successfully"}

@router.post("/{habit_id}/checkin", response_model=schemas.HabitResponse)
def checkin_habit(
    habit_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    """
    Check-in to advance habit streak. Handles consecutive days checks.
    """
    habit = db.query(models.Habit).filter(
        models.Habit.id == habit_id,
        (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    today_str = date.today().isoformat()
    yesterday_str = (date.today() - timedelta(days=1)).isoformat()
    
    if habit.last_checked_date == today_str:
        # Already checked in today
        return habit
    
    if habit.last_checked_date == yesterday_str:
        # Consecutive check-in
        habit.streak += 1
    else:
        # Broken streak or first check-in
        habit.streak = 1
        
    if habit.streak > habit.longest_streak:
        habit.longest_streak = habit.streak
        
    habit.last_checked_date = today_str
    db.commit()
    db.refresh(habit)
    return habit
