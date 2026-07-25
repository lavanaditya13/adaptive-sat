"""add sections and practice context

Revision ID: 9d2f6d5a1b11
Revises: 0843c71159ef
Create Date: 2026-07-25 01:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9d2f6d5a1b11"
down_revision: Union[str, Sequence[str], None] = "0843c71159ef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.bulk_insert(
        sa.table(
            "sections",
            sa.column("id", sa.Integer()),
            sa.column("name", sa.String(length=50)),
            sa.column("display_name", sa.String(length=100)),
        ),
        [
            {"id": 1, "name": "math", "display_name": "Math"},
            {
                "id": 2,
                "name": "reading_writing",
                "display_name": "Reading and Writing",
            },
        ],
    )

    op.create_table(
        "practice_context",
        sa.Column("id", sa.Integer(), sa.Identity(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("selected_section_id", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["selected_section_id"], ["sections.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id"),
    )

    op.add_column("practice_sessions", sa.Column("section_id", sa.Integer(), nullable=True))
    op.create_index(
        op.f("ix_practice_sessions_section_id"),
        "practice_sessions",
        ["section_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_practice_sessions_section_id_sections",
        "practice_sessions",
        "sections",
        ["section_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_practice_sessions_section_id_sections",
        "practice_sessions",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_practice_sessions_section_id"), table_name="practice_sessions")
    op.drop_column("practice_sessions", "section_id")

    op.drop_table("practice_context")
    op.drop_table("sections")
