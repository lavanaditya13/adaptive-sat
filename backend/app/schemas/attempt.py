from datetime import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AttemptBase(BaseModel):
    practice_session_id: uuid.UUID
    question_id: uuid.UUID
    selected_answer: Optional[str] = None
    time_spent_seconds: Optional[int] = Field(default=None, ge=0)
    confidence_level: Optional[int] = Field(default=None, ge=1, le=5)


class AttemptCreate(AttemptBase):
    pass


class AttemptUpdate(BaseModel):
    selected_answer: Optional[str] = None
    time_spent_seconds: Optional[int] = Field(default=None, ge=0)
    confidence_level: Optional[int] = Field(default=None, ge=1, le=5)


class AttemptResponse(AttemptBase):
    id: uuid.UUID
    student_id: uuid.UUID
    topic_id: uuid.UUID
    correct_answer: str
    is_correct: bool
    mistake_type: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)