"""add question.skill column and align topic codes with the current digital SAT domain names

Revision ID: c8d3f1a9b6e4
Revises: b7a1c9f4e3d2
Create Date: 2026-08-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c8d3f1a9b6e4"
down_revision: Union[str, Sequence[str], None] = "b7a1c9f4e3d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("questions", sa.Column("skill", sa.String(length=255), nullable=True))

    # The original sample seed used the legacy "Heart of Algebra" domain
    # name; the 100-question set uses "Algebra", the current official
    # Digital SAT domain name. Rename in place (same topic_id, so any
    # existing questions/attempts pointing at it are unaffected) instead of
    # letting the new seed create a second, duplicate topic for the same
    # skill area. No-ops cleanly if the row doesn't exist (fresh database,
    # or already renamed).
    op.execute(
        "UPDATE topics SET code = 'ALGEBRA', name = 'Algebra' "
        "WHERE code = 'HEART_OF_ALGEBRA'"
    )

    # Minor naming consistency fix to match the current official domain
    # name's hyphenation; matched by code, not name, so this is purely
    # cosmetic and doesn't affect any lookups.
    op.execute(
        "UPDATE topics SET name = 'Problem-Solving and Data Analysis' "
        "WHERE code = 'PROBLEM_SOLVING_DATA' "
        "AND name = 'Problem Solving and Data Analysis'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE topics SET name = 'Problem Solving and Data Analysis' "
        "WHERE code = 'PROBLEM_SOLVING_DATA' "
        "AND name = 'Problem-Solving and Data Analysis'"
    )
    op.execute(
        "UPDATE topics SET code = 'HEART_OF_ALGEBRA', name = 'Heart of Algebra' "
        "WHERE code = 'ALGEBRA'"
    )
    op.drop_column("questions", "skill")
