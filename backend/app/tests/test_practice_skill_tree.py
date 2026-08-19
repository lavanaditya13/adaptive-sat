from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.models.user import User
from app.services import practice_service as practice_service_module
from app.services.mastery_model import DEFAULT_PARAMETERS, MODEL_NAME
from app.services.skill_scoring_service import (
    MASTERY_ACCURACY_PERCENT,
    MASTERY_MIN_QUESTIONS,
    UNCATEGORIZED_SKILL_NAME,
    build_skill_tree,
    get_section_skill_tree,
)

# Fixed so attempt fixtures below are reproducible; the mastery model is
# order-sensitive but doesn't care what "now" is, so an arbitrary instant
# is fine as long as every attempt in a test uses it (or an offset from
# it) consistently.
_NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def _attempt(topic_id: int, skill: str | None, is_correct: bool, difficulty: str = "medium"):
    """One (topic_id, skill, is_correct, difficulty, created_at) row, the
    shape get_section_skill_tree's attempts query and build_skill_tree
    both expect."""
    return (topic_id, skill, is_correct, difficulty, _NOW)


# (topic_id, topic_code, topic_name, skill) — one row per distinct
# domain/skill pair in the section's question catalogue.
MATH_CURRICULUM = [
    (7, "ALGEBRA", "Algebra", "Linear Equations"),
    (7, "ALGEBRA", "Algebra", "Linear Inequalities"),
    (4, "ADVANCED_MATH", "Advanced Math", "Quadratics"),
    (4, "ADVANCED_MATH", "Advanced Math", None),
]


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeSession:
    """Replays canned execute() results in order — see
    test_practice_session_lockout for why the service layer is tested
    against a stand-in rather than a real session."""

    def __init__(self, execute_results):
        self._execute_results = list(execute_results)

    async def execute(self, *_args, **_kwargs):
        assert self._execute_results, "no more canned execute() results"
        return self._execute_results.pop(0)


def _make_student(student_id: int = 1) -> User:
    return User(id=student_id, email="student@example.com", role="student", is_active=True)


def _domain(tree: list[dict], name: str) -> dict:
    return next(domain for domain in tree if domain["name"] == name)


def _skill(domain: dict, name: str) -> dict:
    return next(skill for skill in domain["skills"] if skill["name"] == name)


def test_untouched_curriculum_still_lists_every_domain_and_skill():
    """The mastery view lists the whole curriculum, so a student with zero
    attempts must get the full tree zeroed out rather than an empty list."""
    tree = build_skill_tree(curriculum_rows=MATH_CURRICULUM, attempt_rows=[])

    assert [domain["name"] for domain in tree] == ["Advanced Math", "Algebra"]

    for domain in tree:
        assert domain["accuracy"] == 0
        assert domain["questions_attempted"] == 0
        assert domain["mastered"] is False
        assert domain["mastery_score"] == 0
        assert domain["skills"]

        for skill in domain["skills"]:
            assert skill["accuracy"] == 0
            assert skill["questions_attempted"] == 0
            assert skill["mastered"] is False
            assert skill["mastery_score"] == 0


def test_domain_topic_id_is_the_position_start_practice_expects():
    """topic_id is the 1-based position within the section ordered by name,
    matching what _load_section_topics hands the client — not the Topic
    primary key (which is 7 and 4 in this fixture)."""
    tree = build_skill_tree(curriculum_rows=MATH_CURRICULUM, attempt_rows=[])

    assert [(domain["name"], domain["topic_id"]) for domain in tree] == [
        ("Advanced Math", 1),
        ("Algebra", 2),
    ]


def test_accuracy_rolls_up_from_skills_to_domains():
    attempts = [
        _attempt(7, "Linear Equations", True),
        _attempt(7, "Linear Equations", True),
        _attempt(7, "Linear Equations", False),
        _attempt(7, "Linear Inequalities", False),
    ]

    tree = build_skill_tree(curriculum_rows=MATH_CURRICULUM, attempt_rows=attempts)
    algebra = _domain(tree, "Algebra")

    assert algebra["questions_attempted"] == 4
    assert algebra["questions_correct"] == 2
    assert algebra["accuracy"] == 50

    linear_equations = _skill(algebra, "Linear Equations")
    assert linear_equations["questions_attempted"] == 3
    assert linear_equations["accuracy"] == 67

    inequalities = _skill(algebra, "Linear Inequalities")
    assert inequalities["questions_attempted"] == 1
    assert inequalities["accuracy"] == 0

    # A domain the student never touched is untouched by another domain's
    # attempts.
    assert _domain(tree, "Advanced Math")["questions_attempted"] == 0


def test_skill_less_questions_collect_under_the_general_bucket():
    """Older seed rows are tagged to a domain but have no skill. They still
    have to show up, or a domain's skill rows won't sum to the domain."""
    attempts = [_attempt(4, None, True), _attempt(4, "Quadratics", False)]

    tree = build_skill_tree(curriculum_rows=MATH_CURRICULUM, attempt_rows=attempts)
    advanced_math = _domain(tree, "Advanced Math")

    general = _skill(advanced_math, UNCATEGORIZED_SKILL_NAME)
    assert general["questions_attempted"] == 1
    assert general["accuracy"] == 100

    assert advanced_math["questions_attempted"] == 2
    assert sum(skill["questions_attempted"] for skill in advanced_math["skills"]) == 2

    # ...and it sorts last so it never lands between real skill names.
    assert advanced_math["skills"][-1]["name"] == UNCATEGORIZED_SKILL_NAME


def test_mastered_flag_is_applied_per_node():
    """mastered is driven by the BKT model (mastery_model.py), not a raw
    accuracy threshold — see test_mastery_model.py for the underlying math.
    This just checks build_skill_tree wires each node's own attempts into
    it correctly, independent of its siblings."""
    attempts = [_attempt(7, "Linear Equations", True) for _ in range(10)] + [
        _attempt(7, "Linear Inequalities", False) for _ in range(10)
    ]

    tree = build_skill_tree(curriculum_rows=MATH_CURRICULUM, attempt_rows=attempts)
    algebra = _domain(tree, "Algebra")

    assert _skill(algebra, "Linear Equations")["mastered"] is True
    assert _skill(algebra, "Linear Inequalities")["mastered"] is False
    # A mixed 10-correct/10-incorrect history across the domain isn't
    # mastered even though one of its two skills individually is.
    assert algebra["mastered"] is False


def test_attempts_on_questions_outside_the_catalogue_are_ignored():
    tree = build_skill_tree(
        curriculum_rows=MATH_CURRICULUM,
        attempt_rows=[_attempt(999, "Some Retired Skill", True)],
    )

    assert [domain["name"] for domain in tree] == ["Advanced Math", "Algebra"]
    assert all(domain["questions_attempted"] == 0 for domain in tree)


@pytest.mark.asyncio
async def test_get_section_skill_tree_reads_catalogue_then_attempts():
    db = _FakeSession(
        [
            _FakeResult(MATH_CURRICULUM),
            _FakeResult(
                [
                    _attempt(7, "Linear Equations", True),
                    _attempt(7, "Linear Equations", True),
                ]
            ),
        ]
    )

    tree = await get_section_skill_tree(db=db, student_id=1, section_code="math")

    assert _skill(_domain(tree, "Algebra"), "Linear Equations")["accuracy"] == 100


@pytest.mark.asyncio
async def test_get_skill_tree_wraps_the_tree_with_the_mastery_rule():
    db = _FakeSession([_FakeResult(MATH_CURRICULUM), _FakeResult([])])

    response = await practice_service_module.get_skill_tree(
        db=db,
        student=_make_student(),
        section="math",
    )

    assert response.section == "math"
    assert response.section_display_name == "Math"
    assert response.mastery_rule.accuracy == MASTERY_ACCURACY_PERCENT
    assert response.mastery_rule.min_questions == MASTERY_MIN_QUESTIONS
    assert response.mastery_rule.model == MODEL_NAME
    assert response.mastery_rule.mastery_threshold == DEFAULT_PARAMETERS.mastery_threshold
    assert [domain.name for domain in response.domains] == ["Advanced Math", "Algebra"]


@pytest.mark.asyncio
async def test_get_skill_tree_serializes_as_camel_case_for_the_client():
    db = _FakeSession(
        [
            _FakeResult([(7, "ALGEBRA", "Algebra", "Linear Equations")]),
            _FakeResult([_attempt(7, "Linear Equations", True)]),
        ]
    )

    response = await practice_service_module.get_skill_tree(
        db=db,
        student=_make_student(),
        section="math",
    )
    payload = response.model_dump(by_alias=True)

    assert payload["sectionDisplayName"] == "Math"
    assert payload["masteryRule"] == {
        "accuracy": 85,
        "minQuestions": 10,
        "model": "bayesian_knowledge_tracing",
        "masteryThreshold": 0.9,
    }
    assert payload["domains"][0] == {
        "name": "Algebra",
        "topicId": 1,
        "topicCode": "ALGEBRA",
        "accuracy": 100,
        "questionsAttempted": 1,
        "questionsCorrect": 1,
        "mastered": False,
        "masteryScore": 65,
        "skills": [
            {
                "name": "Linear Equations",
                "accuracy": 100,
                "questionsAttempted": 1,
                "questionsCorrect": 1,
                "mastered": False,
                "masteryScore": 65,
            }
        ],
    }


@pytest.mark.asyncio
async def test_get_skill_tree_falls_back_to_the_selected_section(monkeypatch):
    """Omitting ?section= uses whatever POST /context/section last set, so
    the client doesn't have to track the section in two places."""
    db = _FakeSession([_FakeResult(MATH_CURRICULUM), _FakeResult([])])

    async def _fake_selected_section_id(db, student_id):
        return 2

    monkeypatch.setattr(
        practice_service_module,
        "_get_selected_section_id",
        _fake_selected_section_id,
    )

    response = await practice_service_module.get_skill_tree(db=db, student=_make_student())

    assert response.section == "reading_writing"
    assert response.section_display_name == "Reading and Writing"


@pytest.mark.asyncio
async def test_get_skill_tree_rejects_an_unknown_section():
    with pytest.raises(HTTPException) as exc_info:
        await practice_service_module.get_skill_tree(
            db=_FakeSession([]),
            student=_make_student(),
            section="chemistry",
        )

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_skill_tree_requires_a_section_when_none_was_selected(monkeypatch):
    async def _fake_selected_section_id(db, student_id):
        return None

    monkeypatch.setattr(
        practice_service_module,
        "_get_selected_section_id",
        _fake_selected_section_id,
    )

    with pytest.raises(HTTPException) as exc_info:
        await practice_service_module.get_skill_tree(
            db=_FakeSession([]),
            student=_make_student(),
        )

    assert exc_info.value.status_code == 400
