"""add CHECK constraint for practice_sessions.status

Revision ID: f3a7c1e9d5b2
Revises: d4a6c2f19b8e
Create Date: 2026-08-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f3a7c1e9d5b2"
down_revision: Union[str, Sequence[str], None] = "d4a6c2f19b8e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Keep this in sync with app.core.constants.PracticeSessionStatus, the
# Python enum the ORM model (app/models/practice_session.py) is now typed
# against. The column itself stays a plain VARCHAR(50) — native_enum=False
# on the model's SAEnum type means SQLAlchemy never issues a Postgres
# CREATE TYPE, so this CHECK constraint is the only thing standing between
# the column and an invalid/drifted status string (previously: nothing).
_STATUS_VALUES = ("in_progress", "ready_to_complete", "completed", "abandoned", "expired")


def upgrade() -> None:
    op.create_check_constraint(
        "ck_practice_sessions_status",
        "practice_sessions",
        "status IN (%s)" % ", ".join(f"'{value}'" for value in _STATUS_VALUES),
    )


def downgrade() -> None:
    op.drop_constraint("ck_practice_sessions_status", "practice_sessions", type_="check")
