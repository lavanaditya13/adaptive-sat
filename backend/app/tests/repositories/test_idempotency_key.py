"""Tests for app/repositories/idempotency_key.py and, below, the
IdempotencyKey.endpoint/.status enum + CHECK constraint invariants from
app/models/idempotency_key.py -- same split as
tests/repositories/test_practice_session.py uses for PracticeSessionStatus
(there's no dedicated tests/models/ tree in this codebase; model-level
invariants live in the matching repository's test file instead).
"""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, StatementError

from app.core.constants import IdempotencyKeyStatus, IdempotentEndpoint
from app.core.database import SessionLocal
from app.models.idempotency_key import IdempotencyKey
from app.repositories.idempotency_key import idempotency_key_repository


@pytest.mark.asyncio
async def test_get_by_scope_returns_none_when_absent(student):
    async with SessionLocal() as db:
        result = await idempotency_key_repository.get_by_scope(
            db, student_id=student.id, endpoint=IdempotentEndpoint.PRACTICE_START, key="missing"
        )

    assert result is None


@pytest.mark.asyncio
async def test_get_by_scope_is_scoped_to_endpoint_not_just_key(student):
    """The same client-generated key reused (by mistake) across two
    different actions must not collide -- see uq_idempotency_keys_scope
    and IdempotencyKey's docstring.
    """
    async with SessionLocal() as db:
        row = IdempotencyKey(
            student_id=student.id,
            endpoint=IdempotentEndpoint.PRACTICE_START,
            key="shared-key",
            request_fingerprint="fp",
            status=IdempotencyKeyStatus.IN_PROGRESS,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)

    async with SessionLocal() as db:
        same_scope = await idempotency_key_repository.get_by_scope(
            db, student_id=student.id, endpoint=IdempotentEndpoint.PRACTICE_START, key="shared-key"
        )
        different_endpoint = await idempotency_key_repository.get_by_scope(
            db, student_id=student.id, endpoint=IdempotentEndpoint.PRACTICE_ANSWER, key="shared-key"
        )

    assert same_scope is not None
    assert same_scope.id == row.id
    assert different_endpoint is None


@pytest.mark.asyncio
async def test_get_by_scope_is_scoped_to_student(student):
    """One student's reservation must not be visible to another student's
    lookup for the same key -- if it were, a leaked/guessed key could be
    used to fetch someone else's cached response (see run_idempotent's
    docstring on why the unique constraint is scoped this way, not just
    on the raw key).
    """
    async with SessionLocal() as db:
        row = IdempotencyKey(
            student_id=student.id,
            endpoint=IdempotentEndpoint.PRACTICE_START,
            key="shared-key",
            request_fingerprint="fp",
            status=IdempotencyKeyStatus.IN_PROGRESS,
        )
        db.add(row)
        await db.commit()

    async with SessionLocal() as db:
        other_student_result = await idempotency_key_repository.get_by_scope(
            db,
            student_id=student.id + 1,
            endpoint=IdempotentEndpoint.PRACTICE_START,
            key="shared-key",
        )

    assert other_student_result is None


def _valid_row_kwargs(student_id: int) -> dict:
    return {
        "student_id": student_id,
        "endpoint": IdempotentEndpoint.PRACTICE_START,
        "key": "some-key",
        "request_fingerprint": "fp",
        "status": IdempotencyKeyStatus.IN_PROGRESS,
    }


@pytest.mark.parametrize("field", ["endpoint", "status"])
@pytest.mark.asyncio
async def test_invalid_enum_value_rejected_by_orm(student, field):
    """Both IdempotencyKey.endpoint and .status are typed with a Python
    enum (see app/models/idempotency_key.py) -- a value outside either
    enum should never reach the database in the first place.

    Asserting `.orig` is a plain LookupError, not just any StatementError,
    matters here: IntegrityError is itself a StatementError subclass, so a
    looser assertion would pass even if the enum typing were dropped
    entirely and the invalid value fell through to the DB's CHECK
    constraint instead (a materially different failure this test would
    then be blind to) -- see the same fix applied to
    test_practice_session.py's test_invalid_status_rejected_by_orm for the
    full story of why.
    """
    kwargs = _valid_row_kwargs(student.id)
    kwargs[field] = "not_a_real_value"

    async with SessionLocal() as db:
        db.add(IdempotencyKey(**kwargs))
        with pytest.raises(StatementError) as exc_info:
            await db.flush()

    assert isinstance(exc_info.value.orig, LookupError)
    assert not isinstance(exc_info.value, IntegrityError)


@pytest.mark.parametrize(
    "column,invalid_value",
    [("endpoint", "not_a_real_endpoint"), ("status", "not_a_real_status")],
)
@pytest.mark.asyncio
async def test_invalid_enum_value_rejected_by_check_constraint(student, column, invalid_value):
    """Belt-and-suspenders backstop for test_invalid_enum_value_rejected_by_orm:
    even a raw SQL write that bypasses the ORM's enum validation entirely
    must still be rejected, by ck_idempotency_keys_endpoint /
    ck_idempotency_keys_status (alembic revision a4e8d2c6f105).
    """
    columns = {"endpoint": "practice_start", "status": "in_progress"}
    columns[column] = invalid_value

    async with SessionLocal() as db:
        with pytest.raises(IntegrityError):
            await db.execute(
                text(
                    "INSERT INTO idempotency_keys "
                    "(student_id, endpoint, key, request_fingerprint, status) "
                    "VALUES (:student_id, :endpoint, 'raw-sql-key', 'fp', :status)"
                ),
                {"student_id": student.id, **columns},
            )
