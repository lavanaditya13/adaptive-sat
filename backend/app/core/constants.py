"""Shared literal constants for domain status values and duplicated messages.

These exist so a status/role/message literal is spelled once and imported
everywhere else, instead of being hand-typed in every file that needs it —
see the backend rules in CLAUDE.md ("no magic strings/literals" / "duplicate
queries and literals consolidate into one location").
"""

from enum import Enum


# --- PracticeSession.status -------------------------------------------------
class PracticeSessionStatus(str, Enum):
    """Canonical set of PracticeSession.status values. The model column is
    typed with this enum (see app/models/practice_session.py), and the DB
    additionally enforces it with a CHECK constraint (see alembic revision
    f3a7c1e9d5b2_*), so a value outside this set can't be written by either
    a bug in application code or a hand-run SQL statement.
    """

    IN_PROGRESS = "in_progress"
    READY_TO_COMPLETE = "ready_to_complete"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    EXPIRED = "expired"


# A session is "active" (blocks starting a new one, is returned by
# /practice/current-question, etc.) while it's still being answered or
# waiting on /complete. Keep this in sync with the partial unique index in
# alembic/versions/b7a1c9f4e3d2_*.py, which enforces the same predicate at
# the database level.
ACTIVE_PRACTICE_SESSION_STATUSES = (
    PracticeSessionStatus.IN_PROGRESS,
    PracticeSessionStatus.READY_TO_COMPLETE,
)

# --- PracticeSessionQuestion.status -----------------------------------------
PRACTICE_SESSION_QUESTION_STATUS_ASSIGNED = "assigned"
PRACTICE_SESSION_QUESTION_STATUS_ANSWERED = "answered"

# --- Shared error-detail strings --------------------------------------------
SESSION_ALREADY_IN_PROGRESS_DETAIL = (
    "A practice session is already in progress for this student."
)

# --- Section codes -----------------------------------------------------------
# Same two values as sections.name / practice_service.SECTION_CODES, but that
# dict is keyed by sections.id and lives in practice_service (importing it
# from there for a schema-layer default would be a layering inversion) --
# spelled here once so Topic.section and the seed script don't hand-type the
# literals a third and fourth time.
SECTION_MATH = "math"
SECTION_READING_WRITING = "reading_writing"
