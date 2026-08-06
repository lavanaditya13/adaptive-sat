"""enforce one active practice session per student

Revision ID: b7a1c9f4e3d2
Revises: 6f3e4c2d9a11
Create Date: 2026-08-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7a1c9f4e3d2"
down_revision: Union[str, Sequence[str], None] = "6f3e4c2d9a11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # "One active session per student" was previously an app-level check
    # (SELECT then INSERT with no lock in between) — a classic TOCTOU race
    # that let two concurrent requests both create an active session. This
    # partial unique index makes the invariant impossible to violate: a
    # second concurrent INSERT for the same student fails with an
    # IntegrityError, which the service layer turns into the same 409 the
    # app-level check already returned for the non-racing case.
    op.create_index(
        "ux_practice_sessions_active_per_student",
        "practice_sessions",
        ["student_id"],
        unique=True,
        postgresql_where=sa.text("status IN ('in_progress', 'ready_to_complete')"),
    )


def downgrade() -> None:
    op.drop_index("ux_practice_sessions_active_per_student", table_name="practice_sessions")
