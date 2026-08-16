from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.constants import PracticeSessionStatus
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.attempt import Attempt
    from app.models.practice_session_question import PracticeSessionQuestion
    from app.models.user import User


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    topic_id: Mapped[int | None] = mapped_column(
        ForeignKey("topics.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    section_id: Mapped[int | None] = mapped_column(
        ForeignKey("sections.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    mode: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="adaptive",
        server_default="adaptive",
    )

    question_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=25,
        server_default="25",
    )

    # native_enum=False keeps the column a plain VARCHAR (no Postgres CREATE
    # TYPE / ALTER TYPE ceremony on future value additions) while still
    # giving the Python side a real PracticeSessionStatus, validated on
    # write. The DB-level backstop is the CHECK constraint added in alembic
    # revision f3a7c1e9d5b2_*, not this type — see that migration's
    # docstring for why the constraint isn't declared here via
    # create_constraint=True (it'd duplicate, not replace, the migration).
    status: Mapped[PracticeSessionStatus] = mapped_column(
        SAEnum(
            PracticeSessionStatus,
            name="practice_session_status",
            native_enum=False,
            length=50,
            validate_strings=True,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=PracticeSessionStatus.IN_PROGRESS,
        server_default=PracticeSessionStatus.IN_PROGRESS.value,
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

    student: Mapped["User"] = relationship(
        back_populates="practice_sessions",
    )

    attempts: Mapped[list["Attempt"]] = relationship(
        back_populates="practice_session",
        cascade="all, delete-orphan",
    )

    session_questions: Mapped[list["PracticeSessionQuestion"]] = relationship(
        back_populates="practice_session",
        cascade="all, delete-orphan",
    )