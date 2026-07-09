from datetime import datetime
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict

class PracticeSessionBase(BaseModel):
    student_id: uuid.UUID
    title: Optional[str] = None
    status: str = "started"

class PracticeSessionCreate(BaseModel):
    student_id: uuid.UUID
    title: Optional[str] = None

class PracticeSessionUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None

class PracticeSessionResponse(PracticeSessionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
