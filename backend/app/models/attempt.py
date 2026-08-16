from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.practice_session import PracticeSession
    from app.models.question import Question


# The question runner asks the student to self-rate confidence on a 1-5
# scale (default 3). Named here rather than inlined in the constraint so
# tests can assert against the same bounds the model enforces. Migration
# d4f2a7c1b8e5 repeats the literals deliberately — migrations have to keep
# working against the schema as it was, not follow this constant if it moves.
CONFIDENCE_MIN = 1
CONFIDENCE_MAX = 5
CONFIDENCE_CHECK_CONSTRAINT_NAME = "ck_attempts_confidence_level_range"


class Attempt(Base):
    __tablename__ = "attempts"

    __table_args__ = (
        CheckConstraint(
            f"confidence_level IS NULL "
            f"OR (confidence_level >= {CONFIDENCE_MIN} AND confidence_level <= {CONFIDENCE_MAX})",
            name=CONFIDENCE_CHECK_CONSTRAINT_NAME,
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    practice_session_id: Mapped[int] = mapped_column(
        ForeignKey("practice_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    selected_answer: Mapped[str | None] = mapped_column(String(255), nullable=True)

    correct_answer: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_correct: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    time_spent_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # Student's self-rated confidence for this question, 1-5. Nullable:
    # attempts recorded before the confidence prompt existed have none, and
    # clients that don't send one still submit successfully.
    confidence_level: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    mistake_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    practice_session: Mapped["PracticeSession"] = relationship(
        back_populates="attempts",
    )

    question: Mapped["Question"] = relationship(
        back_populates="attempts",
    )