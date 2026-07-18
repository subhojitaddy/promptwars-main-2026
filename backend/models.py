from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Habit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)  # Enterprise: Multi-user isolation
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    target_description = Column(String, nullable=True)
    streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_checked_date = Column(String, nullable=True)  # YYYY-MM-DD
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    logs = relationship("CravingLog", back_populates="habit", cascade="all, delete-orphan")

class CravingLog(Base):
    __tablename__ = "craving_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)  # Enterprise: Multi-user isolation
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)
    severity = Column(Integer, nullable=False)  # 1 to 5
    trigger_context = Column(String, nullable=True)  # e.g., Boredom, Stress, Social pressure
    mood = Column(String, nullable=True)  # e.g., Anxious, Tired, Happy
    was_resisted = Column(Boolean, default=True)  # True = resisted, False = slipped
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    habit = relationship("Habit", back_populates="logs")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)  # Enterprise: Multi-user isolation
    sender = Column(String, nullable=False)  # 'user' or 'coach'
    text = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
