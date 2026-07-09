from datetime import datetime
import uuid
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class StudyPlanBase(BaseModel):
    student_id: uuid.UUID
    title: str
    description: Optional[str] = None
    recommended_topics: Dict[str, Any]  # Target topics, subtopics, status, and deadlines
    is_active: bool = True

class StudyPlanCreate(StudyPlanBase):
    pass

class StudyPlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    recommended_topics: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class StudyPlanResponse(StudyPlanBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
