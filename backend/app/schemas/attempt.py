from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class AttemptBase(BaseModel):
    practice_session_id: uuid.UUID
    question_id: uuid.UUID
    selected_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    time_spent_seconds: Optional[int] = None
    confidence_level: Optional[int] = Field(default=None, ge=1, le=5)
    mistake_type: Optional[str] = None

class AttemptCreate(BaseModel):
    practice_session_id: uuid.UUID
    question_id: uuid.UUID
    selected_answer: str
    time_spent_seconds: Optional[int] = None
    confidence_level: Optional[int] = Field(default=None, ge=1, le=5)

class AttemptUpdate(BaseModel):
    selected_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    time_spent_seconds: Optional[int] = None
    confidence_level: Optional[int] = Field(default=None, ge=1, le=5)
    mistake_type: Optional[str] = None

class AttemptResponse(AttemptBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
