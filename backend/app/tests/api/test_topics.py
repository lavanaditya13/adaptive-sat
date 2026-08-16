"""Endpoint-layer test for app/api/v1/endpoints/topics.py.

Calls the handler function directly with a mocked service, matching
test_settings.py's/test_auth.py's established style for a plain
auth-gated GET with no request body -- see test_practice.py's docstring
for why a heavier TestClient/dependency_overrides setup is reserved for
routes with header-parsing behavior to verify, which this route doesn't
have.
"""

from unittest.mock import AsyncMock

import pytest

from app.api.v1.endpoints import topics as topics_module
from app.models.user import User
from app.schemas.practice import TopicMasteryResponse, TopicsResponse


def _make_student(student_id: int = 1) -> User:
    return User(id=student_id, email="student@example.com", role="student", is_active=True)


@pytest.mark.asyncio
async def test_list_topics_delegates_to_the_service_and_returns_its_response(monkeypatch):
    expected = TopicsResponse(
        topics=[
            TopicMasteryResponse(
                topic_id=1,
                topic_code="ALGEBRA",
                name="Algebra",
                section="math",
                section_display_name="Math",
                accuracy=0,
                questions_attempted=0,
                questions_correct=0,
                mastered=False,
                started=False,
            )
        ]
    )
    mock_get_topics_overview = AsyncMock(return_value=expected)
    monkeypatch.setattr(topics_module, "get_topics_overview", mock_get_topics_overview)

    student = _make_student()
    db = object()
    response = await topics_module.list_topics(current_user=student, db=db)

    assert response is expected
    mock_get_topics_overview.assert_awaited_once_with(db=db, student=student)
