from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attempt import Attempt
from app.models.question import Question
from app.models.topic import Topic
from app.services.mastery_model import (
    MasteryAttemptInput,
    get_parameters_for_skill,
    weighted_mastery_score,
)

# Roughly what the live Bayesian Knowledge Tracing model (mastery_model.py)
# requires in the common case of a sustained run of correct answers —
# reported in MasteryRuleResponse so clients/docs have a legible
# equivalent, since "p(know) >= 0.9 under a slip/guess-aware HMM" doesn't
# fit in a UI label. Not read by any scoring code below; the actual
# threshold lives in mastery_model.DEFAULT_PARAMETERS.mastery_threshold.
MASTERY_ACCURACY_PERCENT = 85
MASTERY_MIN_QUESTIONS = 10

# Questions whose `skill` is NULL (older seed rows tagged only to a domain)
# still have to appear somewhere, or a domain's skill rows won't add up to
# the domain's own totals. They're collected under this bucket.
UNCATEGORIZED_SKILL_NAME = "General"


def accuracy_percent(correct: int, attempted: int) -> int:
    """Accuracy as a whole percent. The skill tree renders integers, so the
    rounding happens once here instead of at each call site."""
    if not attempted:
        return 0

    return round(correct / attempted * 100)


def classify_mistake_type(
    selected_answer: str | None,
    is_correct: bool,
    time_spent_seconds: int | None,
    confidence_level: int | None,
) -> str | None:
    if is_correct:
        return None

    if not selected_answer:
        return "skipped"

    if time_spent_seconds is not None and time_spent_seconds <= 10:
        return "likely_guess"

    if confidence_level is not None and confidence_level >= 4:
        return "misconception"

    if confidence_level is not None and confidence_level <= 2:
        return "low_confidence"

    return "concept_gap"


async def get_student_progress(db: AsyncSession, student_id: int) -> dict:
    # Joined to Question for `difficulty` — one query, so the weighting
    # below never issues a per-attempt lookup (see mastery_model.py).
    result = await db.execute(
        select(Attempt, Question.difficulty)
        .join(Question, Question.id == Attempt.question_id)
        .where(Attempt.student_id == student_id)
    )

    rows = result.all()
    attempts = [attempt for attempt, _difficulty in rows]

    total_attempted = len(attempts)
    total_correct = sum(1 for attempt in attempts if attempt.is_correct)
    overall_accuracy = total_correct / total_attempted if total_attempted else 0

    topic_attempts: dict[int, list[MasteryAttemptInput]] = defaultdict(list)

    for attempt, difficulty in rows:
        topic_attempts[attempt.topic_id].append(
            MasteryAttemptInput(
                is_correct=attempt.is_correct,
                difficulty=difficulty,
                created_at=attempt.created_at,
            )
        )

    performance_by_topic = []

    for topic_id, attempt_inputs in topic_attempts.items():
        topic = await db.get(Topic, topic_id)
        estimate = weighted_mastery_score(attempt_inputs)

        performance_by_topic.append(
            {
                "topic_id": topic_id,
                "topic_name": topic.name if topic else "Unknown Topic",
                "attempted": len(attempt_inputs),
                "correct": sum(1 for a in attempt_inputs if a.is_correct),
                "accuracy": round(estimate.raw_accuracy, 2),
                "mastery_score": round(estimate.score, 2),
            }
        )

    # Ranked by the weighted mastery score, not raw accuracy — a topic
    # with one attempt at 0% no longer outranks one with 200 attempts at
    # 40% just because it looks worse on paper; the weighting already
    # accounts for how little a single attempt actually tells you.
    weakest_topics = sorted(
        performance_by_topic,
        key=lambda topic: topic["mastery_score"],
    )[:3]

    return {
        "student_id": student_id,
        "total_attempted": total_attempted,
        "total_correct": total_correct,
        "overall_accuracy": round(overall_accuracy, 2),
        "performance_by_topic": performance_by_topic,
        "weakest_topics": weakest_topics,
        "attempts": attempts,
    }


def compute_day_streak(attempt_dates: list[date]) -> int:
    """
    Computes a streak of consecutive UTC-calendar days with at least one
    attempt. Buckets by UTC date since no per-user timezone is tracked
    yet, so a streak can appear to break a few hours "early" for
    students west of UTC.
    """
    if not attempt_dates:
        return 0

    unique_dates = set(attempt_dates)
    today = datetime.now(timezone.utc).date()

    cursor = today if today in unique_dates else today - timedelta(days=1)

    streak = 0
    while cursor in unique_dates:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


async def compute_section_accuracy(db: AsyncSession, student_id: int) -> dict[str, dict]:
    result = await db.execute(
        select(Question.section, Attempt.is_correct)
        .join(Question, Attempt.question_id == Question.id)
        .where(Attempt.student_id == student_id)
    )

    section_stats = defaultdict(lambda: {"attempted": 0, "correct": 0})

    for section, is_correct in result.all():
        section_stats[section]["attempted"] += 1

        if is_correct:
            section_stats[section]["correct"] += 1

    return {
        section: {
            "attempted": stats["attempted"],
            "correct": stats["correct"],
            "accuracy": round(stats["correct"] / stats["attempted"], 2)
            if stats["attempted"]
            else 0.0,
        }
        for section, stats in section_stats.items()
    }


def _skill_sort_key(skill_name: str) -> tuple[int, str]:
    # Alphabetical, with the catch-all bucket pinned to the bottom so it
    # never sorts into the middle of the real skill names.
    return (1 if skill_name == UNCATEGORIZED_SKILL_NAME else 0, skill_name)


def build_skill_tree(
    curriculum_rows: list[tuple[int, str, str, str | None]],
    attempt_rows: list[tuple[int, str | None, bool, str | None, datetime]],
) -> list[dict]:
    """Folds a section's question catalogue and a student's attempts into
    the domain -> skill accuracy tree.

    `curriculum_rows` are distinct (topic_id, topic_code, topic_name, skill)
    tuples covering every question in the section; `attempt_rows` are
    (topic_id, skill, is_correct, difficulty, created_at) tuples for that
    student's attempts in the same section — difficulty feeds the BKT
    slip-rate weighting and created_at establishes attempt order, both fed
    into the mastery estimate (mastery_model.py). The catalogue drives the
    shape, so domains and skills the student has never touched still
    appear at 0% with 0 attempted — the UI lists the whole curriculum, not
    just what's been practised.

    Split out from get_section_skill_tree as a pure function so the folding
    rules can be tested without a database.
    """
    domains: dict[int, dict] = {}

    def _ensure_domain(topic_id: int, topic_code: str, topic_name: str) -> dict:
        return domains.setdefault(
            topic_id,
            {
                "topic_code": topic_code,
                "name": topic_name,
                "attempted": 0,
                "correct": 0,
                "attempts": [],
                "skills": {},
            },
        )

    def _ensure_skill(domain: dict, skill_name: str) -> dict:
        return domain["skills"].setdefault(
            skill_name, {"attempted": 0, "correct": 0, "attempts": []}
        )

    for topic_id, topic_code, topic_name, skill in curriculum_rows:
        domain = _ensure_domain(topic_id, topic_code, topic_name)
        _ensure_skill(domain, skill or UNCATEGORIZED_SKILL_NAME)

    for topic_id, skill, is_correct, difficulty, created_at in attempt_rows:
        domain = domains.get(topic_id)

        if domain is None:
            # Only reachable if a question moved out of this section after
            # being attempted; nothing sensible to attach it to.
            continue

        skill_stats = _ensure_skill(domain, skill or UNCATEGORIZED_SKILL_NAME)
        attempt_input = MasteryAttemptInput(
            is_correct=is_correct, difficulty=difficulty, created_at=created_at
        )

        domain["attempted"] += 1
        domain["attempts"].append(attempt_input)
        skill_stats["attempted"] += 1
        skill_stats["attempts"].append(attempt_input)

        if is_correct:
            domain["correct"] += 1
            skill_stats["correct"] += 1

    ordered_domains = sorted(domains.values(), key=lambda domain: domain["name"])

    tree: list[dict] = []

    # topic_id is the 1-based position within the section, matching the
    # identifier _load_section_topics hands out and start_practice_session
    # expects — both order by topic name, so the positions line up.
    for position, domain in enumerate(ordered_domains, start=1):
        skills = []

        for skill_name, stats in sorted(
            domain["skills"].items(),
            key=lambda item: _skill_sort_key(item[0]),
        ):
            # A skill is the one granularity with a clean single identity
            # to calibrate parameters for later (see
            # mastery_model.get_parameters_for_skill) — domain/topic-level
            # estimates below blend multiple skills together, so there's
            # no single skill to key a fitted lookup off.
            skill_estimate = weighted_mastery_score(
                stats["attempts"], parameters=get_parameters_for_skill(skill_name)
            )
            skills.append(
                {
                    "name": skill_name,
                    "accuracy": accuracy_percent(stats["correct"], stats["attempted"]),
                    "questions_attempted": stats["attempted"],
                    "questions_correct": stats["correct"],
                    "mastered": skill_estimate.mastered,
                    "mastery_score": round(skill_estimate.score * 100),
                }
            )

        domain_estimate = weighted_mastery_score(domain["attempts"])

        tree.append(
            {
                "name": domain["name"],
                "topic_id": position,
                "topic_code": domain["topic_code"],
                "accuracy": accuracy_percent(domain["correct"], domain["attempted"]),
                "questions_attempted": domain["attempted"],
                "questions_correct": domain["correct"],
                "mastered": domain_estimate.mastered,
                "mastery_score": round(domain_estimate.score * 100),
                "skills": skills,
            }
        )

    return tree


async def get_section_skill_tree(
    db: AsyncSession,
    student_id: int,
    section_code: str,
) -> list[dict]:
    """Per-domain and per-skill accuracy for one student in one section.

    Deliberately reads the same Attempt table get_student_progress does,
    just grouped one level finer (Question.skill under Topic) and scoped to
    a section, so the tree can never disagree with the topic accuracy the
    dashboard and study plan are built from.
    """
    curriculum_result = await db.execute(
        select(Topic.id, Topic.code, Topic.name, Question.skill)
        .join(Question, Question.topic_id == Topic.id)
        .where(Question.section == section_code)
        .distinct()
    )

    attempts_result = await db.execute(
        select(
            Question.topic_id,
            Question.skill,
            Attempt.is_correct,
            Question.difficulty,
            Attempt.created_at,
        )
        .join(Question, Question.id == Attempt.question_id)
        .where(
            Attempt.student_id == student_id,
            Question.section == section_code,
        )
    )

    return build_skill_tree(
        curriculum_rows=list(curriculum_result.all()),
        attempt_rows=list(attempts_result.all()),
    )


async def get_weakest_skills(
    db: AsyncSession,
    student_id: int,
    section_code: str,
    limit: int,
) -> list[dict]:
    """Ranks a section's (topic, skill) pairs weakest first by BKT
    mastery_score, for adaptive question selection.

    Built on get_section_skill_tree rather than a separate query, so this
    can never disagree with what the mastery view itself reports for the
    same student/section -- just flattened out of the domain -> skill tree
    into a ranked list. `topic_id` here is the tree's 1-based section
    position (matching every other public `topic_id`), not the Topic
    primary key -- see practice_service._load_section_topic_rows to
    resolve one to the other.
    """
    tree = await get_section_skill_tree(db=db, student_id=student_id, section_code=section_code)

    flattened = [
        {
            "topic_id": domain["topic_id"],
            "skill": skill["name"],
            "mastery_score": skill["mastery_score"],
        }
        for domain in tree
        for skill in domain["skills"]
    ]

    return sorted(flattened, key=lambda row: row["mastery_score"])[:limit]


def compute_avg_session_minutes(
    total_time_spent_seconds: int,
    sessions_completed: int,
) -> float:
    if not sessions_completed:
        return 0.0

    return round(total_time_spent_seconds / 60 / sessions_completed, 1)


def compute_accuracy_trend(attempts: list[Attempt]) -> float:
    now = datetime.now(timezone.utc)
    recent_cutoff = now - timedelta(days=7)

    recent = [attempt for attempt in attempts if attempt.created_at >= recent_cutoff]
    older = [attempt for attempt in attempts if attempt.created_at < recent_cutoff]

    if not older:
        return 0.0

    recent_accuracy = (
        sum(1 for attempt in recent if attempt.is_correct) / len(recent) if recent else 0.0
    )
    older_accuracy = sum(1 for attempt in older if attempt.is_correct) / len(older)

    return round((recent_accuracy - older_accuracy) * 100, 1)