from __future__ import annotations
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.topic import Topic
    from app.models.attempt import Attempt

class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    prompt: Mapped[str] = mapped_column(String, nullable=False)
    choices: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)  # E.g. {"A": "Option 1", "B": "Option 2"}
    correct_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str | None] = mapped_column(String, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(50), default="Medium", nullable=False)  # Easy, Medium, Hard
    topic_id: Mapped[int] = mapped_column(Integer, ForeignKey("topics.id"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # Relationships
    topic: Mapped[Topic] = relationship(back_populates="questions")
    attempts: Mapped[list[Attempt]] = relationship(back_populates="question", cascade="all, delete-orphan")
