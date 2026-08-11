from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.question import Question


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # SAT section this topic's domain belongs to (math / reading_writing —
    # see app.core.constants.SECTION_MATH / SECTION_READING_WRITING). Every
    # topic created going forward must set this (enforced by TopicCreate,
    # not a DB constraint — see migration d4a6c2f19b8e docstring for why
    # this stays nullable at the DB level: a topic with no linked Question
    # has no source to backfill a value from).
    section: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )

    # Self-reference used to express the College Board domain -> skill
    # hierarchy: a domain is a Topic with parent_topic_id IS NULL, a skill
    # is a Topic whose parent_topic_id points at its domain. Existed since
    # the initial schema but was unused until this hierarchy was wired up.
    parent_topic_id: Mapped[int | None] = mapped_column(
        ForeignKey("topics.id", ondelete="SET NULL"),
        nullable=True,
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

    questions: Mapped[list["Question"]] = relationship(
        back_populates="topic",
        cascade="all, delete-orphan",
    )
