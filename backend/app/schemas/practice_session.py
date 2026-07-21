from datetime import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.question import QuestionResponse


class PracticeSessionBase(BaseModel):
    student_id: uuid.UUID
    topic_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    status: str = "in_progress"


class PracticeSessionCreate(BaseModel):
    student_id: uuid.UUID
    topic_id: Optional[uuid.UUID] = None
    question_count: int = Field(default=5, ge=1, le=50)
    title: Optional[str] = None


class PracticeSessionUpdate(BaseModel):
    topic_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    status: Optional[str] = None


class PracticeSessionResponse(PracticeSessionBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PracticeSessionWithQuestionsResponse(BaseModel):
    session: PracticeSessionResponse
    questions: list[QuestionResponse]