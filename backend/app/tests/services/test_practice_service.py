from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.user import User
from app.schemas.practice import PracticeStartRequest
from app.services import practice_service as practice_service_module


def _make_student(student_id: int = 1) -> User:
    return User(id=student_id, email="student@example.com", role="student", is_active=True)


def _make_session(*, session_id: int, status: str, created_at: datetime) -> PracticeSession:
    session = PracticeSession(
        student_id=1,
        section_id=1,
        mode="section",
        status=status,
        question_count=1,
    )
    session.id = session_id
    session.created_at = created_at
    return session


class _FakeResult:
    """Stands in for the SQLAlchemy Result object returned by db.execute().

    Supports both the scalar_one_or_none() call sites and the
    scalars().unique().all() call sites used across practice_service.
    """

    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalars(self):
        return self

    def unique(self):
        return self

    def all(self):
        return self._value


class _FakeSession:
    """A minimal AsyncSession stand-in that replays canned execute() results
    in order. practice_service issues raw db.execute(select(...)) calls
    directly rather than going through a repository, so there's nothing to
    monkeypatch at the repository layer for these tests — this fake plays
    that role instead."""

    def __init__(self, execute_results):
        self._execute_results = list(execute_results)
        self.added: list[object] = []
        self.flush_count = 0
        self.commit_count = 0
        self.rollback_count = 0

    async def execute(self, *_args, **_kwargs):
        assert self._execute_results, "no more canned execute() results — test under-specified them"
        return self._execute_results.pop(0)

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, PracticeSession) and obj.id is None:
            obj.id = 999

    async def flush(self):
        self.flush_count += 1

    async def commit(self):
        self.commit_count += 1

    async def rollback(self):
        self.rollback_count += 1


@pytest.mark.asyncio
async def test_stale_zero_attempt_session_does_not_block_new_start(monkeypatch):
    """Reproduces the reported bug: a session abandoned before answering a
    single question used to block that student from ever starting again.
    Once it's older than PRACTICE_SESSION_STALE_MINUTES it should be
    auto-superseded instead of raising 409."""
    stale_session = _make_session(
        session_id=417,
        status="in_progress",
        created_at=datetime.now(timezone.utc) - timedelta(hours=6),
    )
    question = Question(id=1, topic_id=1, section="math", choices={}, correct_answer="A")

    db = _FakeSession(
        [
            _FakeResult(stale_session),  # existing active-session check
            _FakeResult(None),  # _get_latest_attempt_at — zero attempts
            _FakeResult(1),  # selected_section_id
            _FakeResult([question]),  # fresh question query (dedup filter applied)
            _FakeResult([]),  # fallback query (supplement when pool exhausted)
        ]
    )
    monkeypatch.setattr(
        practice_service_module,
        "_get_next_assigned_question",
        AsyncMock(return_value=None),
    )

    response = await practice_service_module.start_practice_session(
        db=db,
        request=PracticeStartRequest(mode="section"),
        student=_make_student(),
    )

    assert stale_session.status == "abandoned"
    assert response.status == "in_progress"
    assert db.commit_count == 1


@pytest.mark.asyncio
async def test_active_recent_session_still_blocks_new_start():
    """Preserves existing behavior: a genuinely active session (created
    moments ago) must still return 409, not be swept up by the staleness
    fix."""
    recent_session = _make_session(
        session_id=1,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    db = _FakeSession(
        [
            _FakeResult(recent_session),  # existing active-session check
            _FakeResult(None),  # _get_latest_attempt_at — zero attempts, but recent
        ]
    )

    with pytest.raises(HTTPException) as exc_info:
        await practice_service_module.start_practice_session(
            db=db,
            request=PracticeStartRequest(mode="section"),
            student=_make_student(),
        )

    assert exc_info.value.status_code == 409
    assert db.commit_count == 0


@pytest.mark.asyncio
async def test_abandon_practice_session_marks_active_session_abandoned(monkeypatch):
    active_session = _make_session(
        session_id=5,
        status="ready_to_complete",
        created_at=datetime.now(timezone.utc),
    )
    monkeypatch.setattr(
        practice_service_module,
        "_get_active_session_for_student",
        AsyncMock(return_value=active_session),
    )

    db = _FakeSession([])
    response = await practice_service_module.abandon_practice_session(
        db=db,
        student=_make_student(),
    )

    assert active_session.status == "abandoned"
    assert response.status == "abandoned"
    assert db.commit_count == 1


@pytest.mark.asyncio
async def test_expire_stale_practice_sessions_uses_configured_ttl_and_commits(monkeypatch):
    """Pins two things at once: the cutoff handed to the repository is
    derived from PRACTICE_SESSION_EXPIRE_HOURS (not
    PRACTICE_SESSION_STALE_MINUTES -- easy to mix up given how similar the
    two settings are), and the service -- not the repository -- owns the
    commit, per this codebase's transaction-ownership convention."""
    mock_expire_stale_sessions = AsyncMock(return_value=3)
    monkeypatch.setattr(
        practice_service_module.practice_session_repository,
        "expire_stale_sessions",
        mock_expire_stale_sessions,
    )

    db = _FakeSession([])
    result = await practice_service_module.expire_stale_practice_sessions(db=db)

    assert result == 3
    assert db.commit_count == 1

    passed_cutoff = mock_expire_stale_sessions.await_args.kwargs["cutoff"]
    expected_cutoff = datetime.now(timezone.utc) - timedelta(
        hours=practice_service_module.settings.PRACTICE_SESSION_EXPIRE_HOURS
    )
    assert abs((expected_cutoff - passed_cutoff).total_seconds()) < 5


def _make_domain(
    *,
    topic_id: int,
    topic_code: str,
    name: str,
    questions_attempted: int = 0,
    questions_correct: int = 0,
    accuracy: int = 0,
    mastered: bool = False,
) -> dict:
    """Matches the dict shape build_skill_tree/get_section_skill_tree
    return (see test_skill_scoring_service.py) -- get_topics_overview reads
    these fields by key, not through a model, so tests exercise that same
    plain-dict contract instead of a schema stand-in."""
    return {
        "topic_id": topic_id,
        "topic_code": topic_code,
        "name": name,
        "questions_attempted": questions_attempted,
        "questions_correct": questions_correct,
        "accuracy": accuracy,
        "mastered": mastered,
        "skills": [],
    }


@pytest.mark.asyncio
async def test_get_topics_overview_covers_every_section_with_its_own_section_fields(monkeypatch):
    """The whole point of this endpoint over GET /practice/skill-tree: every
    item self-reports its own section, since the response mixes sections
    together instead of scoping to one per call."""

    async def _fake_get_section_skill_tree(db, student_id, section_code):
        if section_code == "math":
            return [_make_domain(topic_id=1, topic_code="ALGEBRA", name="Algebra")]

        return [_make_domain(topic_id=1, topic_code="GRAMMAR", name="Grammar")]

    monkeypatch.setattr(
        practice_service_module, "get_section_skill_tree", _fake_get_section_skill_tree
    )

    response = await practice_service_module.get_topics_overview(
        db=object(), student=_make_student()
    )

    assert {(t.section, t.name) for t in response.topics} == {
        ("math", "Algebra"),
        ("reading_writing", "Grammar"),
    }
    math_topic = next(t for t in response.topics if t.section == "math")
    assert math_topic.section_display_name == "Math"


@pytest.mark.asyncio
async def test_get_topics_overview_marks_unattempted_topics_as_not_started(monkeypatch):
    """A topic with zero attempts must still appear (not be omitted) and be
    unambiguously flagged not-started, per the topics-endpoint acceptance
    criteria -- distinct from a topic that's been attempted and is
    genuinely at 0% accuracy."""

    async def _fake_get_section_skill_tree(db, student_id, section_code):
        if section_code != "math":
            return []

        return [
            _make_domain(topic_id=1, topic_code="UNTOUCHED", name="Untouched"),
            _make_domain(
                topic_id=2,
                topic_code="ATTEMPTED",
                name="Attempted",
                questions_attempted=4,
                questions_correct=1,
                accuracy=25,
            ),
        ]

    monkeypatch.setattr(
        practice_service_module, "get_section_skill_tree", _fake_get_section_skill_tree
    )

    response = await practice_service_module.get_topics_overview(
        db=object(), student=_make_student()
    )

    untouched = next(t for t in response.topics if t.name == "Untouched")
    attempted = next(t for t in response.topics if t.name == "Attempted")

    assert untouched.started is False
    assert untouched.questions_attempted == 0
    assert attempted.started is True
    assert attempted.accuracy == 25


@pytest.mark.asyncio
async def test_get_topics_overview_preserves_the_deep_link_topic_id(monkeypatch):
    """topic_id must pass through unchanged from get_section_skill_tree --
    it's the section-scoped positional id POST /practice/start expects
    (see DomainNodeResponse.topic_id), not something this function may
    renumber."""

    async def _fake_get_section_skill_tree(db, student_id, section_code):
        if section_code != "math":
            return []

        return [_make_domain(topic_id=2, topic_code="ALGEBRA", name="Algebra")]

    monkeypatch.setattr(
        practice_service_module, "get_section_skill_tree", _fake_get_section_skill_tree
    )

    response = await practice_service_module.get_topics_overview(
        db=object(), student=_make_student()
    )

    algebra = next(t for t in response.topics if t.name == "Algebra")
    assert algebra.topic_id == 2
    assert algebra.topic_code == "ALGEBRA"


@pytest.mark.parametrize(
    "created_at,last_attempt_at,expected_stale",
    [
        (datetime.now(timezone.utc) - timedelta(hours=6), None, True),
        (datetime.now(timezone.utc), None, False),
        (
            datetime.now(timezone.utc) - timedelta(hours=6),
            datetime.now(timezone.utc) - timedelta(minutes=5),
            False,
        ),
    ],
)
def test_is_session_stale(created_at, last_attempt_at, expected_stale):
    session = _make_session(session_id=1, status="in_progress", created_at=created_at)
    assert (
        practice_service_module._is_session_stale(session, last_attempt_at) is expected_stale
    )


# --- _target_difficulty_for_mastery (adaptive question selection) ----------


@pytest.mark.parametrize(
    "mastery_score, expected_difficulty",
    [
        (0, "easy"),
        (29, "easy"),
        (30, "medium"),
        (69, "medium"),
        (70, "hard"),
        (100, "hard"),
    ],
)
def test_target_difficulty_for_mastery_bands(mastery_score, expected_difficulty):
    assert (
        practice_service_module._target_difficulty_for_mastery(mastery_score)
        == expected_difficulty
    )
