"""Endpoint-layer tests for app/api/v1/endpoints/practice.py.

Two styles here, deliberately: most tests call the handler function
directly with mocked services (matching test_auth.py's established
style -- see that file's docstring for why), which is enough to pin the
Python-level wiring from the Idempotency-Key parameter into
run_idempotent's call. But a direct call bypasses FastAPI's request
pipeline entirely, so it can't catch a typo in the header *alias* itself
(e.g. "IdempotencyKey" instead of "Idempotency-Key") -- the "_over_http"
tests go through a real request via TestClient specifically for that.
Idempotency-key *behavior* (replay/reject/reclaim) is exercised in
tests/services/test_idempotency_service.py against a real DB; none of that
is retested here.

Covers only start_practice/answer_question, the two handlers this ticket
touched. The rest of this router has no endpoint-level tests yet -- a
pre-existing gap (see the backend-rules-2026-08 memory's "known deferred
item" note), not something to silently extend further here.
"""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import practice as practice_module
from app.core.constants import IdempotentEndpoint, PracticeSessionStatus
from app.core.database import get_db
from app.core.security import get_current_user
from app.main import app
from app.models.user import User
from app.schemas.practice import (
    PracticeStartRequest,
    PracticeStartResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)


def _make_student(student_id: int = 1) -> User:
    return User(id=student_id, email="student@example.com", role="student", is_active=True)


@pytest.mark.asyncio
async def test_start_practice_passes_idempotency_key_header_through(monkeypatch):
    run_idempotent_mock = AsyncMock(
        return_value=PracticeStartResponse(
            status=PracticeSessionStatus.IN_PROGRESS, mode="section", total_questions=1
        )
    )
    monkeypatch.setattr(practice_module, "run_idempotent", run_idempotent_mock)

    student = _make_student()
    request = PracticeStartRequest(mode="section")

    await practice_module.start_practice(
        request, current_user=student, db=object(), idempotency_key="key-123"
    )

    _, kwargs = run_idempotent_mock.call_args
    assert kwargs["idempotency_key"] == "key-123"
    assert kwargs["endpoint"] == IdempotentEndpoint.PRACTICE_START
    assert kwargs["student_id"] == student.id
    assert kwargs["response_model"] is PracticeStartResponse


@pytest.mark.asyncio
async def test_answer_question_passes_idempotency_key_header_through(monkeypatch):
    run_idempotent_mock = AsyncMock(
        return_value=SubmitAnswerResponse(
            saved=True, answered_position=1, remaining_questions=0, attempt_id=1
        )
    )
    monkeypatch.setattr(practice_module, "run_idempotent", run_idempotent_mock)

    student = _make_student()
    request = SubmitAnswerRequest(selected_answer="A")

    await practice_module.answer_question(
        request, current_user=student, db=object(), idempotency_key="key-456"
    )

    _, kwargs = run_idempotent_mock.call_args
    assert kwargs["idempotency_key"] == "key-456"
    assert kwargs["endpoint"] == IdempotentEndpoint.PRACTICE_ANSWER
    assert kwargs["student_id"] == student.id
    assert kwargs["response_model"] is SubmitAnswerResponse


class _StudentContext:
    """Overrides get_current_user/get_db on the real `app` for one request
    through TestClient, then restores it -- app.dependency_overrides is
    global mutable state shared with every other test module that imports
    `app` (e.g. test_health.py), so this has to clean up even on failure.
    """

    def __init__(self, student: User):
        self._student = student

    def __enter__(self) -> TestClient:
        async def _fake_get_current_user():
            return self._student

        async def _fake_get_db():
            yield object()  # never touched: run_idempotent is mocked out

        app.dependency_overrides[get_current_user] = _fake_get_current_user
        app.dependency_overrides[get_db] = _fake_get_db
        return TestClient(app)

    def __exit__(self, *exc_info):
        app.dependency_overrides.clear()


# These two go through a real HTTP request (unlike every test above, which
# calls the handler function directly) specifically to catch a typo in the
# header alias itself -- e.g. "IdempotencyKey" instead of "Idempotency-Key"
# -- which a direct call can't catch since it never touches header parsing.
@pytest.mark.asyncio
async def test_start_practice_reads_real_idempotency_key_header_over_http(monkeypatch):
    run_idempotent_mock = AsyncMock(
        return_value=PracticeStartResponse(
            status=PracticeSessionStatus.IN_PROGRESS, mode="section", total_questions=1
        )
    )
    monkeypatch.setattr(practice_module, "run_idempotent", run_idempotent_mock)

    with _StudentContext(_make_student()) as client:
        response = client.post(
            "/api/v1/practice/start",
            json={"mode": "section"},
            headers={"Idempotency-Key": "wire-level-key"},
        )

    assert response.status_code == 201
    _, kwargs = run_idempotent_mock.call_args
    assert kwargs["idempotency_key"] == "wire-level-key"


@pytest.mark.asyncio
async def test_start_practice_without_header_over_http_defaults_to_none(monkeypatch):
    run_idempotent_mock = AsyncMock(
        return_value=PracticeStartResponse(
            status=PracticeSessionStatus.IN_PROGRESS, mode="section", total_questions=1
        )
    )
    monkeypatch.setattr(practice_module, "run_idempotent", run_idempotent_mock)

    with _StudentContext(_make_student()) as client:
        response = client.post("/api/v1/practice/start", json={"mode": "section"})

    assert response.status_code == 201
    _, kwargs = run_idempotent_mock.call_args
    assert kwargs["idempotency_key"] is None


@pytest.mark.asyncio
async def test_answer_question_reads_real_idempotency_key_header_over_http(monkeypatch):
    run_idempotent_mock = AsyncMock(
        return_value=SubmitAnswerResponse(
            saved=True, answered_position=1, remaining_questions=0, attempt_id=1
        )
    )
    monkeypatch.setattr(practice_module, "run_idempotent", run_idempotent_mock)

    with _StudentContext(_make_student()) as client:
        response = client.post(
            "/api/v1/practice/answer",
            json={"selected_answer": "A"},
            headers={"Idempotency-Key": "wire-level-key-2"},
        )

    assert response.status_code == 200
    _, kwargs = run_idempotent_mock.call_args
    assert kwargs["idempotency_key"] == "wire-level-key-2"


@pytest.mark.asyncio
async def test_answer_question_without_header_over_http_defaults_to_none(monkeypatch):
    run_idempotent_mock = AsyncMock(
        return_value=SubmitAnswerResponse(
            saved=True, answered_position=1, remaining_questions=0, attempt_id=1
        )
    )
    monkeypatch.setattr(practice_module, "run_idempotent", run_idempotent_mock)

    with _StudentContext(_make_student()) as client:
        response = client.post("/api/v1/practice/answer", json={"selected_answer": "A"})

    assert response.status_code == 200
    _, kwargs = run_idempotent_mock.call_args
    assert kwargs["idempotency_key"] is None
