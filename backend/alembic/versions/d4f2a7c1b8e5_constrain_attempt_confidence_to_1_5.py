"""constrain attempts.confidence_level to the 1-5 rating scale

Revision ID: d4f2a7c1b8e5
Revises: f3a7c1e9d5b2
Create Date: 2026-08-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4f2a7c1b8e5"
down_revision: Union[str, Sequence[str], None] = "f3a7c1e9d5b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CONSTRAINT_NAME = "ck_attempts_confidence_level_range"


def upgrade() -> None:
    # The redesigned question runner rates confidence 1-5 on every question,
    # so the range is now a real domain rule rather than a UI detail. It was
    # only ever enforced in Pydantic (ge=1, le=5); anything writing attempts
    # outside the API — the seeder, a backfill, psql — could store 0, 7 or
    # -1 and silently skew average confidence and mistake classification.
    #
    # Null out any pre-existing out-of-range values first so the constraint
    # can be added without a validation failure. NULL is already the "not
    # rated" case, so this loses nothing that was meaningful.
    op.execute(
        sa.text(
            "UPDATE attempts SET confidence_level = NULL "
            "WHERE confidence_level IS NOT NULL "
            "AND (confidence_level < 1 OR confidence_level > 5)"
        )
    )

    op.create_check_constraint(
        CONSTRAINT_NAME,
        "attempts",
        "confidence_level IS NULL OR (confidence_level >= 1 AND confidence_level <= 5)",
    )


def downgrade() -> None:
    op.drop_constraint(CONSTRAINT_NAME, "attempts", type_="check")
