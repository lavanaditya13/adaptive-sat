"""enforce one linked account per oauth identity

Revision ID: 3ba3aae2a43a
Revises: b563f85526f2
Create Date: 2026-08-07 16:43:28.923434

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ba3aae2a43a'
down_revision: Union[str, Sequence[str], None] = 'b563f85526f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # oauth_service._upsert_oauth_user / _link_oauth_to_current_user do
    # check-then-act on (oauth_provider, oauth_id) with no DB constraint
    # backing it — two concurrent OAuth callbacks (e.g. two tabs) can both
    # pass the "not linked yet" check and link the same third-party identity
    # to two different local users, which today isn't even an exception, it's
    # silent account-confusion data corruption. This partial unique index
    # (only enforced where both columns are set, i.e. for OAuth accounts)
    # makes that impossible; the service layer catches the resulting
    # IntegrityError and returns a clean 409, same pattern as
    # b7a1c9f4e3d2 / b563f85526f2.
    op.create_index(
        "ux_users_one_account_per_oauth_identity",
        "users",
        ["oauth_provider", "oauth_id"],
        unique=True,
        postgresql_where=sa.text("oauth_provider IS NOT NULL AND oauth_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ux_users_one_account_per_oauth_identity", table_name="users")
