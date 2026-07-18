from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
import gemini
from dependencies import get_db, get_user_id

router = APIRouter(prefix="/chat", tags=["chat"])

def get_user_habits_summary(db: Session, user_id: str) -> str:
    habits = db.query(models.Habit).filter(
        (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
    ).all()
    if not habits:
        return "No habits configured yet."
    
    summary = []
    for h in habits:
        summary.append(
            f"Habit: '{h.name}' (Category: {h.category}, Streak: {h.streak} days, Target: {h.target_description or 'None'})"
        )
    return "; ".join(summary)

@router.get("", response_model=List[schemas.ChatMessageResponse])
def get_chat_history(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Retrieve user chat coaching history, isolated by user.
    """
    return db.query(models.ChatMessage).filter(
        (models.ChatMessage.user_id == user_id) | (models.ChatMessage.user_id.is_(None))
    ).order_by(models.ChatMessage.created_at.asc()).all()

@router.post("", response_model=schemas.ChatMessageResponse)
def send_chat_message(
    message: schemas.ChatMessageCreate, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    # 1. Save user message
    db_user_msg = models.ChatMessage(user_id=user_id, sender="user", text=message.text)
    db.add(db_user_msg)
    db.commit()
    db.refresh(db_user_msg)
    
    # 2. Retrieve history for Gemini context (limit to last 10 messages to keep prompt size optimized)
    history_msgs = db.query(models.ChatMessage).filter(
        (models.ChatMessage.user_id == user_id) | (models.ChatMessage.user_id.is_(None))
    ).order_by(models.ChatMessage.created_at.desc()).limit(11).all()
    history_msgs.reverse()  # Order ascending chronologically
    
    # Exclude the newly added user message from the context list since we pass it separately
    chat_context = [{"sender": m.sender, "text": m.text} for m in history_msgs[:-1]]
    
    # Get summary of user habits for AI context
    habits_summary = get_user_habits_summary(db, user_id)
    
    # 3. Call Gemini
    coach_reply_text = gemini.get_coaching_response(
        chat_history=chat_context,
        user_message=message.text,
        habits_summary=habits_summary
    )
    
    # 4. Save coach message
    db_coach_msg = models.ChatMessage(user_id=user_id, sender="coach", text=coach_reply_text)
    db.add(db_coach_msg)
    db.commit()
    db.refresh(db_coach_msg)
    
    return db_coach_msg
