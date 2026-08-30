"""Endpoint-layer tests for app/api/v1/endpoints/study_plan.py.

Calls the handler functions directly with a mocked service, matching
test_topics.py's/test_settings.py's established style for a plain
auth-gated route with no request body or header-parsing behavior to
verify -- see test_practice.py's docstring for when a heavier
TestClient/dependency_overrides setup is warranted instead.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from app.api.v1.endpoints import study_plan as study_plan_module
from app.models.user import User
from app.schemas.study_plan import StudyPlanResponse


def _make_student(student_id: int = 1) -> User:
    return User(id=student_id, email="student@example.com", role="student", is_active=True)


def _make_response(student_id: int) -> StudyPlanResponse:
    return StudyPlanResponse(
        id=1,
        student_id=student_id,
        title="Recommended Study Plan",
        status="active",
        items=[
            {
                "topic_id": 1,
                "topic_name": "Algebra",
                "priority": "high",
                "recommended_questions": 20,
                "reason": "Mastery score is 30%, so this topic should be reviewed.",
            }
        ],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.mark.asyncio
async def test_get_study_plan_delegates_to_get_or_create_for_the_current_user(monkeypatch):
    student = _make_student(student_id=42)
    expected = _make_response(student_id=42)
    mock_get_or_create = AsyncMock(return_value=expected)
    monkeypatch.setattr(study_plan_module, "get_or_create_study_plan_for_student", mock_get_or_create)

    db = object()
    response = await study_plan_module.get_study_plan(current_user=student, db=db)

    assert response is expected
    mock_get_or_create.assert_awaited_once_with(db=db, student_id=42)


@pytest.mark.asyncio
async def test_regenerate_study_plan_delegates_to_generate_for_the_current_user(monkeypatch):
    student = _make_student(student_id=7)
    expected = _make_response(student_id=7)
    mock_generate = AsyncMock(return_value=expected)
    monkeypatch.setattr(study_plan_module, "generate_study_plan_for_student", mock_generate)

    db = object()
    response = await study_plan_module.regenerate_study_plan(current_user=student, db=db)

    assert response is expected
    mock_generate.assert_awaited_once_with(db=db, student_id=7)
