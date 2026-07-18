from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
import gemini
from dependencies import get_db, get_user_id

router = APIRouter(tags=["grounding"])

@router.get("/nudge", response_model=schemas.AICoachResponse)
def get_intelligent_nudge(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Generate an intelligent habit nudge based on existing habit progress and craving logs.
    """
    # Grab habits belonging to user
    habits = db.query(models.Habit).filter(
        (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
    ).all()
    if not habits:
        return {"response": "Welcome to MindfulFlow! Setup a habit above to begin your mindful coaching journey."}
        
    # Pick a habit - preferably one that had a recent craving
    latest_log = db.query(models.CravingLog).filter(
        (models.CravingLog.user_id == user_id) | (models.CravingLog.user_id.is_(None))
    ).order_by(models.CravingLog.created_at.desc()).first()
    
    target_habit = None
    if latest_log:
        target_habit = db.query(models.Habit).filter(
            models.Habit.id == latest_log.habit_id,
            (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
        ).first()
        
    if not target_habit:
        # Default to first habit
        target_habit = habits[0]
        
    # Get triggers for target habit
    recent_logs = db.query(models.CravingLog).filter(
        models.CravingLog.habit_id == target_habit.id,
        (models.CravingLog.user_id == user_id) | (models.CravingLog.user_id.is_(None))
    ).limit(5).all()
    
    triggers = list(set([log.trigger_context for log in recent_logs if log.trigger_context]))
    trigger_summary = ", ".join(triggers)
    
    nudge_text = gemini.generate_nudge(
        habit_name=target_habit.name,
        streak=target_habit.streak,
        trigger_summary=trigger_summary
    )
    
    return {"response": nudge_text}

@router.post("/grounding", response_model=schemas.AICoachResponse)
def get_grounding_session(
    req: schemas.UrgentGroundingRequest, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Generate an immediate grounding exercise for when user hits the SOS/Panic button.
    """
    habit = db.query(models.Habit).filter(
        models.Habit.id == req.habit_id,
        (models.Habit.user_id == user_id) | (models.Habit.user_id.is_(None))
    ).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    grounding_text = gemini.generate_grounding_exercise(
        habit_name=habit.name,
        mood=req.current_mood
    )
    
    return {"response": grounding_text}
