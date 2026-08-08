"""enforce one attempt per session question

Revision ID: b563f85526f2
Revises: c8d3f1a9b6e4
Create Date: 2026-08-07 16:42:40.532586

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b563f85526f2'
down_revision: Union[str, Sequence[str], None] = 'c8d3f1a9b6e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # submit_answer() reads the current "assigned" PracticeSessionQuestion
    # then writes an Attempt for it — a TOCTOU race like the one
    # b7a1c9f4e3d2 closed for session starts. Two concurrent submissions for
    # the same session can both read the same assigned question before
    # either writes, and both insert an Attempt for it, double-counting in
    # scoring. This unique index makes a second concurrent INSERT for the
    # same (practice_session_id, question_id) fail with IntegrityError,
    # which the service layer turns into a 409.
    op.create_index(
        "ux_attempts_one_per_session_question",
        "attempts",
        ["practice_session_id", "question_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ux_attempts_one_per_session_question", table_name="attempts")
