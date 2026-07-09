from datetime import datetime
import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class QuestionBase(BaseModel):
    prompt: str
    choices: Dict[str, Any]  # Key-value options (e.g. {"A": "Option A", "B": "Option B"})
    correct_answer: str
    explanation: Optional[str] = None
    difficulty: str = "Medium"  # Easy, Medium, Hard
    topic_id: int

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    prompt: Optional[str] = None
    choices: Optional[Dict[str, Any]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    topic_id: Optional[int] = None

class QuestionResponse(QuestionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
