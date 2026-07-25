from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AttemptBase(BaseModel):
    practice_session_id: int
    question_id: int
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
    id: int
    student_id: int
    topic_id: int
    correct_answer: str
    is_correct: bool
    mistake_type: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)