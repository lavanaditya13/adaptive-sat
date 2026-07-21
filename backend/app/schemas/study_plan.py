from datetime import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class StudyPlanBase(BaseModel):
    student_id: uuid.UUID
    title: Optional[str] = None
    status: str = "active"
    items: list[dict[str, Any]] = Field(default_factory=list)


class StudyPlanCreate(StudyPlanBase):
    pass


class StudyPlanUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    items: Optional[list[dict[str, Any]]] = None


class StudyPlanResponse(StudyPlanBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)