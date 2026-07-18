from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# Chat Message schemas
class ChatMessageBase(BaseModel):
    sender: str
    text: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Craving Log schemas
class CravingLogBase(BaseModel):
    severity: int = Field(..., ge=1, le=5)
    trigger_context: Optional[str] = None
    mood: Optional[str] = None
    was_resisted: bool = True
    notes: Optional[str] = None

class CravingLogCreate(CravingLogBase):
    habit_id: int

class CravingLogResponse(CravingLogBase):
    id: int
    habit_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Habit schemas
class HabitBase(BaseModel):
    name: str
    category: str
    target_description: Optional[str] = None

class HabitCreate(HabitBase):
    pass

class HabitResponse(HabitBase):
    id: int
    streak: int
    longest_streak: int
    last_checked_date: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HabitDetailResponse(HabitResponse):
    logs: List[CravingLogResponse] = []

    model_config = ConfigDict(from_attributes=True)

# Custom response for AI Insights and Grounding requests
class AICoachResponse(BaseModel):
    response: str

class UrgentGroundingRequest(BaseModel):
    habit_id: int
    current_mood: str
