from datetime import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class QuestionBase(BaseModel):
    prompt: str
    choices: dict[str, Any]
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: str = "medium"
    topic_id: uuid.UUID


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    prompt: Optional[str] = None
    choices: Optional[dict[str, Any]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    topic_id: Optional[uuid.UUID] = None


class QuestionResponse(QuestionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)