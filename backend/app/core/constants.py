"""Shared literal constants for domain status values and duplicated messages.

These exist so a status/role/message literal is spelled once and imported
everywhere else, instead of being hand-typed in every file that needs it —
see the backend rules in CLAUDE.md ("no magic strings/literals" / "duplicate
queries and literals consolidate into one location").
"""

# --- PracticeSession.status -------------------------------------------------
PRACTICE_SESSION_STATUS_IN_PROGRESS = "in_progress"
PRACTICE_SESSION_STATUS_READY_TO_COMPLETE = "ready_to_complete"
PRACTICE_SESSION_STATUS_COMPLETED = "completed"
PRACTICE_SESSION_STATUS_ABANDONED = "abandoned"

# A session is "active" (blocks starting a new one, is returned by
# /practice/current-question, etc.) while it's still being answered or
# waiting on /complete. Keep this in sync with the partial unique index in
# alembic/versions/b7a1c9f4e3d2_*.py, which enforces the same predicate at
# the database level.
ACTIVE_PRACTICE_SESSION_STATUSES = (
    PRACTICE_SESSION_STATUS_IN_PROGRESS,
    PRACTICE_SESSION_STATUS_READY_TO_COMPLETE,
)

# --- PracticeSessionQuestion.status -----------------------------------------
PRACTICE_SESSION_QUESTION_STATUS_ASSIGNED = "assigned"
PRACTICE_SESSION_QUESTION_STATUS_ANSWERED = "answered"

# --- Shared error-detail strings --------------------------------------------
SESSION_ALREADY_IN_PROGRESS_DETAIL = (
    "A practice session is already in progress for this student."
)
