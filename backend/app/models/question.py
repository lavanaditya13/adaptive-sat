from __future__ import annotations

from datetime import datetime
from typing import Any, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt
    from app.models.practice_session_question import PracticeSessionQuestion
    from app.models.topic import Topic


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    section: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="math",
        server_default="math",
        index=True,
    )

    prompt: Mapped[str] = mapped_column(Text, nullable=False)

    choices: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )

    correct_answer: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    explanation: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    difficulty: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="medium",
        server_default="medium",
    )

    # Fine-grained skill within a topic (e.g. "Words in Context" under the
    # broader "Craft and Structure" topic). Deliberately not used to drive
    # any UI or query yet — Practice by Topic still lists topics only — this
    # just carries the finer-grained tag through so it's there when/if a
    # skill-level view gets built, instead of having to backfill it later.
    skill: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    topic: Mapped["Topic"] = relationship(
        back_populates="questions",
    )

    attempts: Mapped[list["Attempt"]] = relationship(
        back_populates="question",
    )

    session_questions: Mapped[list["PracticeSessionQuestion"]] = relationship(
        back_populates="question",
    )