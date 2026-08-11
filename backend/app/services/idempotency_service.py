"""Wraps a mutating service call so a retried request with the same
Idempotency-Key replays the original response instead of re-running the
action -- see backend/.claude/rules/backend.md's practice domain model and
database.py's NullPool comment for why a client on Vercel/Neon genuinely
can't always tell whether its first request landed.

Reservation pattern (Stripe's is the well-known version of this): insert a
row scoped to (student, endpoint, key) *before* running the action; the
insert's success or failure is what decides whether this call is the
original or a retry, not anything the caller has to track itself.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, TypeVar

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import (
    IDEMPOTENCY_KEY_IN_PROGRESS_DETAIL,
    IDEMPOTENCY_KEY_REUSED_DETAIL,
    IdempotencyKeyStatus,
    IdempotentEndpoint,
)
from app.models.idempotency_key import IdempotencyKey
from app.repositories.idempotency_key import idempotency_key_repository

ResponseT = TypeVar("ResponseT", bound=BaseModel)


def compute_request_fingerprint(request: BaseModel) -> str:
    """Canonical hash of a request body, used to detect an Idempotency-Key
    reused (by a buggy or malicious client) for a materially different
    request than the one it was first issued for.
    """
    canonical = request.model_dump_json()
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _stale_cutoff() -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=settings.IDEMPOTENCY_KEY_STALE_MINUTES)


async def _reclaim_stale(db: AsyncSession, row: IdempotencyKey) -> bool:
    """Atomically take over a reservation stuck in_progress past the
    staleness window -- the request that created it was presumably killed
    mid-flight rather than ever finishing. A conditional UPDATE + rowcount
    check, not a plain read-then-write, so two callers racing to reclaim
    the same stale row can't both win: mirrors
    practice_service.complete_practice_session's guard against the same
    shape of race.
    """
    result = await db.execute(
        update(IdempotencyKey)
        .where(
            IdempotencyKey.id == row.id,
            IdempotencyKey.status == IdempotencyKeyStatus.IN_PROGRESS,
            IdempotencyKey.updated_at < _stale_cutoff(),
        )
        .values(status=IdempotencyKeyStatus.IN_PROGRESS, response_body=None)
    )
    await db.commit()
    return result.rowcount == 1


async def run_idempotent(
    db: AsyncSession,
    *,
    student_id: int,
    endpoint: IdempotentEndpoint,
    idempotency_key: str | None,
    request_fingerprint: str,
    response_model: type[ResponseT],
    execute: Callable[[], Awaitable[ResponseT]],
) -> ResponseT:
    """Run `execute()` at most once per (student, endpoint, idempotency_key).

    `idempotency_key` is optional: a request sent without one just runs
    execute() directly, unprotected, exactly like before this wrapper
    existed. That's deliberate, not a shortcut -- frontend/ is owned
    separately (see the always-enforce-backend-rules memory) and hasn't
    necessarily shipped the header yet, so this can't require it without
    breaking every /start and /answer call in production the moment it
    deploys. Protection is opt-in until every caller sends the header.

    Commits multiple times, not once at the end like most service
    entrypoints in this codebase default to: the reservation has to be
    committed *before* execute() runs so a concurrent call on another
    connection can actually see it (an uncommitted INSERT is invisible
    across connections), and the finalize/release step has to be its own
    transaction *after* execute()'s own commit, not folded into it. Three
    genuinely separate transactions is inherent to the reserve-then-execute
    pattern, not an oversight.
    """
    if not idempotency_key:
        return await execute()

    insert_stmt = (
        pg_insert(IdempotencyKey)
        .values(
            student_id=student_id,
            endpoint=endpoint,
            key=idempotency_key,
            request_fingerprint=request_fingerprint,
            status=IdempotencyKeyStatus.IN_PROGRESS,
        )
        .on_conflict_do_nothing(constraint="uq_idempotency_keys_scope")
        .returning(IdempotencyKey.id)
    )
    inserted_id = (await db.execute(insert_stmt)).scalar_one_or_none()
    await db.commit()

    if inserted_id is not None:
        reservation_id = inserted_id
    else:
        # Someone (an earlier attempt of this exact call, or a genuine
        # concurrent retry) already holds this key. Figure out which of
        # replay / reject / reclaim applies.
        row = await idempotency_key_repository.get_by_scope(
            db, student_id=student_id, endpoint=endpoint, key=idempotency_key
        )
        if row is None:
            # Shouldn't happen: the insert only no-ops on the unique
            # constraint this exact scope enforces, so a conflict means a
            # matching row exists. A bare `assert` would silently vanish
            # under `python -O` instead of surfacing this as the bug it
            # would be -- see backend rule 6 (no swallowed exceptions).
            raise RuntimeError(
                "idempotency_keys insert conflicted but no matching row was found "
                f"for student_id={student_id}, endpoint={endpoint}, key={idempotency_key!r}"
            )

        if row.request_fingerprint != request_fingerprint:
            raise HTTPException(status_code=409, detail=IDEMPOTENCY_KEY_REUSED_DETAIL)

        if row.status == IdempotencyKeyStatus.COMPLETED:
            return response_model.model_validate(row.response_body)

        if row.updated_at >= _stale_cutoff() or not await _reclaim_stale(db, row):
            raise HTTPException(status_code=409, detail=IDEMPOTENCY_KEY_IN_PROGRESS_DETAIL)

        reservation_id = row.id

    try:
        result = await execute()
    except Exception:
        # Release the reservation rather than leaving it in_progress: the
        # action didn't happen, so there's nothing to replay, and holding
        # the key would just force the client to wait out the staleness
        # window before a legitimate retry could run. rollback() first --
        # execute() may have left the transaction aborted (e.g. an
        # unexpected DB error), and this DELETE has to run in a fresh one.
        await db.rollback()
        await db.execute(delete(IdempotencyKey).where(IdempotencyKey.id == reservation_id))
        await db.commit()
        raise

    await db.execute(
        update(IdempotencyKey)
        .where(IdempotencyKey.id == reservation_id)
        .values(
            status=IdempotencyKeyStatus.COMPLETED,
            response_body=result.model_dump(mode="json"),
        )
    )
    await db.commit()

    return result
