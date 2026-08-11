"""add topic.section, activate the existing parent_topic_id domain/skill hierarchy

Revision ID: d4a6c2f19b8e
Revises: 3ba3aae2a43a
Create Date: 2026-08-10 00:00:00.000000

Adds `topics.section` (math / reading_writing, same values as
Question.section) so a Topic encodes which SAT section its College Board
domain belongs to. The domain -> skill hierarchy itself doesn't need a new
column: `topics.parent_topic_id` has existed as a self-reference since the
initial schema (e78523a6497e) but was never populated -- a domain is a
Topic with parent_topic_id IS NULL, a skill is a Topic whose
parent_topic_id points at its domain.

`section` is backfilled from each topic's linked questions (every topic in
the current seed data belongs to exactly one section, so this is a clean
1:1 derivation) but the column stays nullable at the DB level -- a topic
with zero linked questions has no source to backfill a value from, and
forcing NOT NULL here would fail the migration on any database with such a
row instead of leaving it alone, which is the behavior called for. Every
topic created going forward is required to set it (enforced in
TopicCreate, an app-level invariant, not a DB one -- consistent with how
Question.section/PracticeSession.status are enforced today, no
CheckConstraint precedent exists elsewhere in this schema to introduce
here). No existing FK to `topics` (Question.topic_id, Attempt via
Question, Topic.parent_topic_id) is touched.
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4a6c2f19b8e"
down_revision: Union[str, Sequence[str], None] = "3ba3aae2a43a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("topics", sa.Column("section", sa.String(length=50), nullable=True))
    op.create_index(op.f("ix_topics_section"), "topics", ["section"], unique=False)

    # Backfill each topic's section from its (earliest, for determinism)
    # linked question. Topics with no linked question are left NULL.
    op.execute(
        """
        UPDATE topics
        SET section = backfill.section
        FROM (
            SELECT DISTINCT ON (topic_id) topic_id, section
            FROM questions
            ORDER BY topic_id, id
        ) AS backfill
        WHERE topics.id = backfill.topic_id
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_topics_section"), table_name="topics")
    op.drop_column("topics", "section")
