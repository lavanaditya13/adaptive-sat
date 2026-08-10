from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from app.models.attempt import (
    CONFIDENCE_CHECK_CONSTRAINT_NAME,
    CONFIDENCE_MAX,
    CONFIDENCE_MIN,
    Attempt,
)
from app.models.practice_session import PracticeSession
from app.models.practice_session_question import PracticeSessionQuestion
from app.models.question import Question
from app.models.topic import Topic
from app.models.user import User
from app.schemas.practice import SubmitAnswerRequest
from app.services import practice_service as practice_service_module


def _make_student(student_id: int = 1) -> User:
    return User(id=student_id, email="student@example.com", role="student", is_active=True)


def _make_session(*, session_id: int = 1, mode: str = "topic") -> PracticeSession:
    session = PracticeSession(
        student_id=1,
        section_id=1,
        mode=mode,
        status="in_progress",
        question_count=1,
    )
    session.id = session_id
    return session


def _make_question(question_id: int = 1) -> Question:
    question = Question(
        id=question_id,
        topic_id=3,
        section="math",
        prompt="What is x if 2x + 5 = 15?",
        choices={"A": "3", "B": "5"},
        correct_answer="B",
        explanation="Subtract 5, then halve.",
    )
    question.topic = Topic(id=3, name="Algebra", code="ALGEBRA")
    return question


def _make_session_question(*, position: int = 1, question_id: int = 1) -> PracticeSessionQuestion:
    return PracticeSessionQuestion(
        practice_session_id=1,
        question_id=question_id,
        position=position,
        status="assigned",
    )


class _FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one(self):
        return self._value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return self

    def unique(self):
        return self

    def all(self):
        return self._value


class _FakeSession:
    """Replays canned execute() results in order — see
    test_practice_session_lockout for why practice_service is tested
    against a stand-in rather than a real AsyncSession."""

    def __init__(self, execute_results, get_results=None):
        self._execute_results = list(execute_results)
        self._get_results = dict(get_results or {})
        self.added: list[object] = []
        self.commit_count = 0

    async def execute(self, *_args, **_kwargs):
        assert self._execute_results, "no more canned execute() results"
        return self._execute_results.pop(0)

    async def get(self, model, primary_key):
        return self._get_results.get((model, primary_key))

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        return None

    async def commit(self):
        self.commit_count += 1

    async def refresh(self, _obj):
        return None


def test_answer_request_accepts_the_new_confidence_field():
    """The redesigned runner posts `confidence`; the original client posts
    `confidence_level`. Both have to land on the same attempt column."""
    assert SubmitAnswerRequest.model_validate({"confidence": 4}).confidence_level == 4
    assert SubmitAnswerRequest.model_validate({"confidence_level": 4}).confidence_level == 4


def test_answer_request_leaves_confidence_optional():
    """Existing clients send no rating at all and must keep working."""
    request = SubmitAnswerRequest.model_validate({"selected_answer": "B"})

    assert request.confidence_level is None


@pytest.mark.parametrize("confidence", [0, 6, -1])
def test_answer_request_rejects_ratings_outside_the_scale(confidence):
    with pytest.raises(ValidationError):
        SubmitAnswerRequest.model_validate({"confidence": confidence})


@pytest.mark.parametrize("confidence", [CONFIDENCE_MIN, 3, CONFIDENCE_MAX])
def test_answer_request_accepts_the_whole_scale(confidence):
    assert SubmitAnswerRequest.model_validate({"confidence": confidence}).confidence_level == confidence


def test_attempt_model_carries_the_confidence_range_constraint():
    """Guards the model against drifting from the migration that adds the
    matching CHECK constraint in Postgres."""
    constraint_names = {constraint.name for constraint in Attempt.__table__.constraints}

    assert CONFIDENCE_CHECK_CONSTRAINT_NAME in constraint_names


@pytest.mark.asyncio
async def test_submit_answer_persists_the_confidence_rating(monkeypatch):
    session = _make_session()
    question = _make_question()

    db = _FakeSession(
        execute_results=[
            _FakeResult(session),  # active-session lookup
            _FakeResult(0),  # remaining assigned questions
        ],
        get_results={(Question, 1): question},
    )
    monkeypatch.setattr(
        practice_service_module,
        "_get_next_assigned_question",
        AsyncMock(return_value=_make_session_question()),
    )

    await practice_service_module.submit_answer(
        db=db,
        student=_make_student(),
        request=SubmitAnswerRequest.model_validate({"selected_answer": "B", "confidence": 5}),
    )

    attempt = next(obj for obj in db.added if isinstance(obj, Attempt))
    assert attempt.confidence_level == 5


@pytest.mark.asyncio
async def test_submit_answer_records_no_confidence_when_none_is_sent(monkeypatch):
    session = _make_session()
    question = _make_question()

    db = _FakeSession(
        execute_results=[_FakeResult(session), _FakeResult(0)],
        get_results={(Question, 1): question},
    )
    monkeypatch.setattr(
        practice_service_module,
        "_get_next_assigned_question",
        AsyncMock(return_value=_make_session_question()),
    )

    await practice_service_module.submit_answer(
        db=db,
        student=_make_student(),
        request=SubmitAnswerRequest.model_validate({"selected_answer": "B"}),
    )

    attempt = next(obj for obj in db.added if isinstance(obj, Attempt))
    assert attempt.confidence_level is None


def _make_attempt(*, confidence_level: int | None, is_correct: bool = True) -> Attempt:
    return Attempt(
        practice_session_id=1,
        student_id=1,
        question_id=1,
        topic_id=3,
        selected_answer="B",
        correct_answer="B",
        is_correct=is_correct,
        confidence_level=confidence_level,
        created_at=datetime.now(timezone.utc),
    )


def _complete_session_db(attempts: list[Attempt]) -> _FakeSession:
    session_question = _make_session_question()
    question = _make_question()

    return _FakeSession(
        execute_results=[
            _FakeResult(_make_session()),  # active-session lookup
            _FakeResult(attempts),  # session attempts
            _FakeResult([(session_question, attempt, question) for attempt in attempts]),
        ]
    )


@pytest.mark.asyncio
async def test_completed_session_reports_mean_confidence(monkeypatch):
    """The results screen shows the session's mean confidence to one
    decimal, so the average is rounded server-side."""
    monkeypatch.setattr(
        practice_service_module,
        "generate_study_plan_for_student",
        AsyncMock(),
    )

    db = _complete_session_db(
        [
            _make_attempt(confidence_level=5),
            _make_attempt(confidence_level=4),
            _make_attempt(confidence_level=2),
        ]
    )

    response = await practice_service_module.complete_practice_session(
        db=db,
        student=_make_student(),
    )

    assert response.average_confidence == 3.7
    assert [item.confidence_level for item in response.question_breakdown] == [5, 4, 2]


@pytest.mark.asyncio
async def test_mean_confidence_ignores_unrated_attempts(monkeypatch):
    monkeypatch.setattr(
        practice_service_module,
        "generate_study_plan_for_student",
        AsyncMock(),
    )

    db = _complete_session_db(
        [
            _make_attempt(confidence_level=4),
            _make_attempt(confidence_level=None),
        ]
    )

    response = await practice_service_module.complete_practice_session(
        db=db,
        student=_make_student(),
    )

    assert response.average_confidence == 4.0


@pytest.mark.asyncio
async def test_mean_confidence_is_null_when_nothing_was_rated(monkeypatch):
    monkeypatch.setattr(
        practice_service_module,
        "generate_study_plan_for_student",
        AsyncMock(),
    )

    db = _complete_session_db([_make_attempt(confidence_level=None)])

    response = await practice_service_module.complete_practice_session(
        db=db,
        student=_make_student(),
    )

    assert response.average_confidence is None
