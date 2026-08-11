from datetime import datetime
from typing import List, Optional

from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.constants import ACTIVE_PRACTICE_SESSION_STATUSES, PracticeSessionStatus
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.repositories.base import BaseRepository

class PracticeSessionRepository(BaseRepository[PracticeSession]):
    def __init__(self):
        super().__init__(PracticeSession)

    async def get_active_session_for_student(self, db: AsyncSession, student_id: int) -> Optional[PracticeSession]:
        """
        Fetch the currently active practice session for a student, if any.
        "Active" means in_progress (still answering) or ready_to_complete
        (all questions answered, /complete not yet called). Sessions are
        never given a status of "started". This is the single source of
        truth for the active-session query — app/services/practice_service.py
        calls this rather than re-implementing the predicate.
        """
        query = (
            select(PracticeSession)
            .where(
                PracticeSession.student_id == student_id,
                PracticeSession.status.in_(ACTIVE_PRACTICE_SESSION_STATUSES),
            )
            .order_by(PracticeSession.created_at.desc())
            .limit(1)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_student(self, db: AsyncSession, student_id: int) -> List[PracticeSession]:
        """
        Fetch all practice sessions for a specific student.
        """
        query = select(PracticeSession).where(PracticeSession.student_id == student_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def expire_stale_sessions(self, db: AsyncSession, *, cutoff: datetime) -> int:
        """
        Bulk-mark every in_progress/ready_to_complete session whose last
        activity is older than `cutoff` as expired, in one UPDATE statement
        rather than loading rows into Python and looping (would be an
        unbounded read as the table grows). "Last activity" is the same
        signal app/services/practice_service.py's _is_session_stale uses for
        the single-session lazy check (latest attempt, falling back to
        session creation if never answered) -- this just applies it across
        every student's session at once, since a session whose owner never
        returns is never revisited by that per-student check at all.

        Returns the number of sessions expired. Caller (practice_service.py)
        owns the commit.
        """
        last_attempt_at = (
            select(func.max(Attempt.created_at))
            .where(Attempt.practice_session_id == PracticeSession.id)
            .correlate(PracticeSession)
            .scalar_subquery()
        )
        last_activity_at = func.coalesce(last_attempt_at, PracticeSession.created_at)

        statement = (
            update(PracticeSession)
            .where(
                PracticeSession.status.in_(ACTIVE_PRACTICE_SESSION_STATUSES),
                last_activity_at < cutoff,
            )
            .values(status=PracticeSessionStatus.EXPIRED)
            # Nothing in this call keeps matching rows loaded in the
            # session's identity map, so there's nothing for the default
            # "evaluate" sync strategy to reconcile -- and it can't handle
            # the correlated-subquery WHERE clause above anyway.
            .execution_options(synchronize_session=False)
        )
        result = await db.execute(statement)
        return result.rowcount or 0

practice_session_repository = PracticeSessionRepository()
