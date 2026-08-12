"""merge idempotency_keys and confidence_level branches

Revision ID: 6b1cc7ade038
Revises: a4e8d2c6f105, d4f2a7c1b8e5
Create Date: 2026-08-10 21:06:12.994303

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b1cc7ade038'
down_revision: Union[str, Sequence[str], None] = ('a4e8d2c6f105', 'd4f2a7c1b8e5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
