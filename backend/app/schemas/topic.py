from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class TopicBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    parent_topic_id: Optional[int] = None


class TopicCreate(TopicBase):
    # Required on create (unlike TopicResponse.section) — every topic
    # created going forward must declare its section; see app/models/topic.py.
    section: str


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    parent_topic_id: Optional[int] = None
    section: Optional[str] = None


class TopicResponse(TopicBase):
    id: int
    section: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TopicDetailResponse(TopicResponse):
    subtopics: list["TopicDetailResponse"] = []


TopicDetailResponse.model_rebuild()
