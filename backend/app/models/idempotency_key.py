from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.constants import IdempotencyKeyStatus, IdempotentEndpoint
from app.core.database import Base


class IdempotencyKey(Base):
    """One row per (student, endpoint, client-generated key): reserves the
    key before the wrapped action runs, then stores its response once it
    finishes, so a retried request with the same key replays that response
    instead of re-running the action. See app/services/idempotency_service.py
    (the only writer of this table) and alembic revision
    a4e8d2c6f105_add_idempotency_keys, which backs both enum columns with a
    CHECK constraint the same way alembic revision f3a7c1e9d5b2_* does for
    PracticeSession.status.
    """

    __tablename__ = "idempotency_keys"
    __table_args__ = (
        UniqueConstraint("student_id", "endpoint", "key", name="uq_idempotency_keys_scope"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    endpoint: Mapped[IdempotentEndpoint] = mapped_column(
        SAEnum(
            IdempotentEndpoint,
            name="idempotent_endpoint",
            native_enum=False,
            length=50,
            validate_strings=True,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )

    # Client-generated (a UUID, by convention -- not enforced server-side,
    # see run_idempotent's docstring on why the header itself is optional).
    key: Mapped[str] = mapped_column(String(128), nullable=False)

    # sha256 hex digest of the request body this key was first used with, so
    # a reused key sent with a materially different body is rejected instead
    # of silently replaying an unrelated response.
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)

    status: Mapped[IdempotencyKeyStatus] = mapped_column(
        SAEnum(
            IdempotencyKeyStatus,
            name="idempotency_key_status",
            native_enum=False,
            length=20,
            validate_strings=True,
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
        default=IdempotencyKeyStatus.IN_PROGRESS,
        server_default=IdempotencyKeyStatus.IN_PROGRESS.value,
    )

    # Populated only once status flips to COMPLETED; NULL while in_progress.
    response_body: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

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
