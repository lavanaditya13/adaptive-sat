"""add target_score to users

Revision ID: 5a08ca0652d4
Revises: 9d2f6d5a1b11
Create Date: 2026-07-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5a08ca0652d4"
down_revision: Union[str, Sequence[str], None] = "9d2f6d5a1b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("target_score", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "target_score")
