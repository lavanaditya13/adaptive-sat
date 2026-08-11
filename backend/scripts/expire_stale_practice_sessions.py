"""Reaper for long-abandoned practice sessions.

Marks every in_progress/ready_to_complete PracticeSession whose last
activity is older than settings.PRACTICE_SESSION_EXPIRE_HOURS as expired.
Unlike the lazy staleness check in practice_service.start_practice_session
(which only supersedes a *student's own* stale session when that student
starts a new one), this covers students who never come back at all -- run
on a schedule (see .github/workflows/expire-practice-sessions.yml) rather
than triggered by any request, so it runs without needing anyone to ask.

Safe to run repeatedly: sessions already outside the active statuses are
left untouched, so a second run just expires nothing new.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
# insert (not append): must win over an editable install of this same
# package elsewhere on sys.path -- see seed_sat_questions.py's identical
# comment for why.
sys.path.insert(0, str(ROOT_DIR))

from app.core.database import get_db
from app.services.practice_service import expire_stale_practice_sessions


async def main() -> None:
    async for db in get_db():
        expired_count = await expire_stale_practice_sessions(db)
        print(f"Practice sessions expired: {expired_count}")
        break


if __name__ == "__main__":
    asyncio.run(main())
