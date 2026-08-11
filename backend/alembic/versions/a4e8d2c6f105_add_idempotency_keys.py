"""add idempotency_keys

Revision ID: a4e8d2c6f105
Revises: f3a7c1e9d5b2
Create Date: 2026-08-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a4e8d2c6f105"
down_revision: Union[str, Sequence[str], None] = "f3a7c1e9d5b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "idempotency_keys",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("endpoint", sa.String(length=50), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column(
            "status", sa.String(length=20), server_default="in_progress", nullable=False
        ),
        sa.Column("response_body", sa.JSON(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "endpoint", "key", name="uq_idempotency_keys_scope"),
        # Same reasoning as ck_practice_sessions_status (alembic revision
        # f3a7c1e9d5b2): the model types these columns with a Python enum
        # (native_enum=False, so no Postgres CREATE TYPE), and this CHECK
        # constraint is what actually keeps an out-of-enum value from being
        # written by anything other than the ORM's own validation.
        sa.CheckConstraint(
            "endpoint IN ('practice_start', 'practice_answer')",
            name="ck_idempotency_keys_endpoint",
        ),
        sa.CheckConstraint(
            "status IN ('in_progress', 'completed')",
            name="ck_idempotency_keys_status",
        ),
    )
    op.create_index(
        op.f("ix_idempotency_keys_student_id"), "idempotency_keys", ["student_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_idempotency_keys_student_id"), table_name="idempotency_keys")
    op.drop_table("idempotency_keys")
