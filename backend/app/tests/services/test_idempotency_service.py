"""Tests for app/services/idempotency_service.py's run_idempotent.

DB-backed (real Postgres via SessionLocal, not mocked): idempotency-key
replay is a persistence/concurrency concern by definition -- the whole
point is what happens across two separate requests/connections racing or
retrying against the same row -- so a mocked session couldn't catch a
break in how reservation/replay/reclaim actually interact with real
commits. Matches the existing DB-backed convention (tests/repositories/,
tests/integration/).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update

from app.core.config import settings
from app.core.constants import IdempotencyKeyStatus, IdempotentEndpoint
from app.core.database import SessionLocal
from app.models.idempotency_key import IdempotencyKey
from app.services.idempotency_service import compute_request_fingerprint, run_idempotent

ENDPOINT = IdempotentEndpoint.PRACTICE_START


class _DummyRequest(BaseModel):
    value: int = 1


class _DummyResponse(BaseModel):
    value: int


FINGERPRINT = compute_request_fingerprint(_DummyRequest())


async def _existing_rows(student_id: int, key: str) -> list[IdempotencyKey]:
    async with SessionLocal() as db:
        result = await db.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.student_id == student_id, IdempotencyKey.key == key
            )
        )
        return list(result.scalars().all())


@pytest.mark.asyncio
async def test_no_key_runs_execute_unprotected_and_writes_no_row(student):
    calls = 0

    async def execute():
        nonlocal calls
        calls += 1
        return _DummyResponse(value=calls)

    async with SessionLocal() as db:
        result = await run_idempotent(
            db,
            student_id=student.id,
            endpoint=ENDPOINT,
            idempotency_key=None,
            request_fingerprint=FINGERPRINT,
            response_model=_DummyResponse,
            execute=execute,
        )

    assert result.value == 1
    assert calls == 1

    async with SessionLocal() as db:
        rows = (
            await db.execute(select(IdempotencyKey).where(IdempotencyKey.student_id == student.id))
        ).scalars().all()
    assert rows == []


@pytest.mark.asyncio
async def test_retry_with_same_key_and_body_replays_without_rerunning(student):
    key = "11111111-1111-1111-1111-111111111111"
    calls = 0

    async def execute():
        nonlocal calls
        calls += 1
        return _DummyResponse(value=calls)

    async def _call():
        async with SessionLocal() as db:
            return await run_idempotent(
                db,
                student_id=student.id,
                endpoint=ENDPOINT,
                idempotency_key=key,
                request_fingerprint=FINGERPRINT,
                response_model=_DummyResponse,
                execute=execute,
            )

    first = await _call()
    second = await _call()

    assert first.value == 1
    assert second.value == 1  # replayed, not a fresh execution
    assert calls == 1  # execute() only ever ran once


@pytest.mark.asyncio
async def test_retry_with_same_key_different_body_is_rejected(student):
    key = "22222222-2222-2222-2222-222222222222"

    async def execute():
        return _DummyResponse(value=1)

    async with SessionLocal() as db:
        await run_idempotent(
            db,
            student_id=student.id,
            endpoint=ENDPOINT,
            idempotency_key=key,
            request_fingerprint=FINGERPRINT,
            response_model=_DummyResponse,
            execute=execute,
        )

    different_fingerprint = compute_request_fingerprint(_DummyRequest(value=2))

    async with SessionLocal() as db:
        with pytest.raises(HTTPException) as exc_info:
            await run_idempotent(
                db,
                student_id=student.id,
                endpoint=ENDPOINT,
                idempotency_key=key,
                request_fingerprint=different_fingerprint,
                response_model=_DummyResponse,
                execute=execute,
            )

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_concurrent_in_progress_request_is_rejected_not_rerun(student):
    """A second call arriving while the first hasn't finished yet (and
    isn't stale) must 409, not block forever and not re-run the action.
    """
    key = "33333333-3333-3333-3333-333333333333"
    started = asyncio.Event()
    finish = asyncio.Event()
    first_calls = 0
    second_calls = 0

    async def slow_execute():
        nonlocal first_calls
        first_calls += 1
        started.set()
        await finish.wait()
        return _DummyResponse(value=first_calls)

    async def second_execute():
        nonlocal second_calls
        second_calls += 1
        return _DummyResponse(value=999)

    async def _first():
        async with SessionLocal() as db:
            return await run_idempotent(
                db,
                student_id=student.id,
                endpoint=ENDPOINT,
                idempotency_key=key,
                request_fingerprint=FINGERPRINT,
                response_model=_DummyResponse,
                execute=slow_execute,
            )

    async def _second():
        await started.wait()
        try:
            async with SessionLocal() as db:
                return await run_idempotent(
                    db,
                    student_id=student.id,
                    endpoint=ENDPOINT,
                    idempotency_key=key,
                    request_fingerprint=FINGERPRINT,
                    response_model=_DummyResponse,
                    execute=second_execute,
                )
        finally:
            finish.set()

    first_result, second_result = await asyncio.gather(
        _first(), _second(), return_exceptions=True
    )

    assert isinstance(first_result, _DummyResponse)
    assert first_result.value == 1
    assert isinstance(second_result, HTTPException)
    assert second_result.status_code == 409
    assert first_calls == 1
    assert second_calls == 0  # the real action never ran a second time


@pytest.mark.asyncio
async def test_stale_in_progress_reservation_is_reclaimed_and_rerun(student):
    """Simulates a request that reserved the key and was then killed
    mid-flight (see database.py's NullPool comment) before finalizing --
    the reservation is backdated past the staleness window by hand here,
    the same way a genuinely abandoned one would look after enough time
    passes for real.
    """
    key = "44444444-4444-4444-4444-444444444444"

    async with SessionLocal() as db:
        stale_row = IdempotencyKey(
            student_id=student.id,
            endpoint=ENDPOINT,
            key=key,
            request_fingerprint=FINGERPRINT,
            status=IdempotencyKeyStatus.IN_PROGRESS,
        )
        db.add(stale_row)
        await db.commit()
        await db.refresh(stale_row)

        await db.execute(
            update(IdempotencyKey)
            .where(IdempotencyKey.id == stale_row.id)
            .values(
                updated_at=datetime.now(timezone.utc)
                - timedelta(minutes=settings.IDEMPOTENCY_KEY_STALE_MINUTES + 1)
            )
        )
        await db.commit()

    calls = 0

    async def execute():
        nonlocal calls
        calls += 1
        return _DummyResponse(value=calls)

    async with SessionLocal() as db:
        result = await run_idempotent(
            db,
            student_id=student.id,
            endpoint=ENDPOINT,
            idempotency_key=key,
            request_fingerprint=FINGERPRINT,
            response_model=_DummyResponse,
            execute=execute,
        )

    assert result.value == 1
    assert calls == 1


@pytest.mark.asyncio
async def test_execute_failure_releases_key_so_retry_can_run_fresh(student):
    key = "55555555-5555-5555-5555-555555555555"
    attempt = 0

    async def flaky_execute():
        nonlocal attempt
        attempt += 1
        if attempt == 1:
            raise HTTPException(status_code=400, detail="boom")
        return _DummyResponse(value=attempt)

    async with SessionLocal() as db:
        with pytest.raises(HTTPException) as exc_info:
            await run_idempotent(
                db,
                student_id=student.id,
                endpoint=ENDPOINT,
                idempotency_key=key,
                request_fingerprint=FINGERPRINT,
                response_model=_DummyResponse,
                execute=flaky_execute,
            )
    assert exc_info.value.status_code == 400

    # Released, not left stuck in_progress -- a retry shouldn't have to
    # wait out the staleness window just because the first attempt failed.
    assert await _existing_rows(student.id, key) == []

    async with SessionLocal() as db:
        result = await run_idempotent(
            db,
            student_id=student.id,
            endpoint=ENDPOINT,
            idempotency_key=key,
            request_fingerprint=FINGERPRINT,
            response_model=_DummyResponse,
            execute=flaky_execute,
        )

    assert result.value == 2
    assert attempt == 2
