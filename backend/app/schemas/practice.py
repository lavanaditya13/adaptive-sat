from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


PracticeMode = Literal["adaptive", "topic", "section"]


class SectionSelectionRequest(BaseModel):
    section_id: int


class UnlockRequirement(BaseModel):
    required_sessions: int
    completed_sessions: int
    remaining_sessions: int


class SectionPracticeOption(BaseModel):
    mode: PracticeMode
    title: str
    description: str
    is_locked: bool
    unlock_requirement: Optional[UnlockRequirement] = None


class TopicActionItem(BaseModel):
    topic_id: int
    name: str
    display_name: str
    action: str


class SectionSelectionResponse(BaseModel):
    practice_options: list[SectionPracticeOption]
    topics: list[TopicActionItem]


class DashboardStudentResponse(BaseModel):
    full_name: str


class DashboardProgressResponse(BaseModel):
    sessions_completed: int
    questions_answered: int
    accuracy_percentage: float


class DashboardWeakTopicResponse(BaseModel):
    topic_id: int
    display_name: str
    mastery_score: float


class DashboardSectionResponse(BaseModel):
    section_id: int
    name: str
    display_name: str


class StudentDashboardResponse(BaseModel):
    student: DashboardStudentResponse
    progress: DashboardProgressResponse
    weak_topics: list[DashboardWeakTopicResponse]
    sections: list[DashboardSectionResponse]


class PracticeStartRequest(BaseModel):
    mode: PracticeMode = "adaptive"
    topic_id: Optional[int] = None
    question_count: Optional[int] = Field(default=None, ge=1, le=100)


class PublicQuestionResponse(BaseModel):
    question_id: int
    prompt: str
    choices: dict[str, Any]


class PracticeQuestionResponse(BaseModel):
    status: str
    current_position: Optional[int] = None
    question: Optional[PublicQuestionResponse] = None


class PracticeStartResponse(BaseModel):
    status: str
    mode: str
    question_count: int
    current_position: Optional[int] = None
    question: Optional[PublicQuestionResponse] = None


class SubmitAnswerRequest(BaseModel):
    selected_answer: Optional[str] = None
    time_spent_seconds: Optional[int] = Field(default=None, ge=0)
    confidence_level: Optional[int] = Field(default=None, ge=1, le=5)


class SubmitAnswerResponse(BaseModel):
    saved: bool
    answered_position: int
    remaining_questions: int


class ScoreSummary(BaseModel):
    correct: int
    incorrect: int
    total: int
    percentage: float


class AdaptiveUnlockResponse(BaseModel):
    is_unlocked: bool
    completed_sessions: int
    required_sessions: int
    remaining_sessions: int


class PracticeCompleteResponse(BaseModel):
    status: str
    score: ScoreSummary
    adaptive_unlock: Optional[AdaptiveUnlockResponse] = None