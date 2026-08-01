from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.attempt import Attempt
from app.models.practice_context import PracticeContext
from app.models.practice_session import PracticeSession
from app.models.practice_session_question import PracticeSessionQuestion
from app.models.question import Question
from app.models.topic import Topic
from app.models.user import User
from app.schemas.practice import (
    AdaptiveUnlockResponse,
    PracticeCompleteResponse,
    PracticeQuestionResponse,
    PracticeStartRequest,
    PracticeStartResponse,
    QuestionBreakdownItem,
    SectionPracticeOption,
    SectionSelectionResponse,
    TopicActionItem,
    UnlockRequirement,
    PublicQuestionResponse,
    ScoreSummary,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.services.recommendation_service import generate_study_plan_for_student
from app.services.skill_scoring_service import classify_mistake_type, get_student_progress


SECTION_CODES = {
    1: "math",
    2: "reading_writing",
}


SECTION_DISPLAY_NAMES = {
    "math": "Math",
    "reading_writing": "Reading and Writing",
}


def _section_code_for_id(section_id: int) -> str:
    section_code = SECTION_CODES.get(section_id)

    if section_code is None:
        raise HTTPException(status_code=404, detail="Section not found")

    return section_code


async def _get_selected_section_id(
    db: AsyncSession,
    student_id: int,
) -> int | None:
    result = await db.execute(
        select(PracticeContext.selected_section_id).where(
            PracticeContext.student_id == student_id
        )
    )
    return result.scalar_one_or_none()


async def _upsert_selected_section(
    db: AsyncSession,
    student: User,
    section_id: int,
) -> PracticeContext:
    result = await db.execute(
        select(PracticeContext).where(PracticeContext.student_id == student.id)
    )
    context = result.scalar_one_or_none()

    if context is None:
        context = PracticeContext(student_id=student.id, selected_section_id=section_id)
        db.add(context)
    else:
        context.selected_section_id = section_id

    await db.flush()
    return context


async def _load_section_topics(
    db: AsyncSession,
    section_code: str,
) -> list[TopicActionItem]:
    result = await db.execute(
        select(Topic)
        .join(Question)
        .where(Question.section == section_code)
        .order_by(Topic.name.asc())
    )
    topics = list(result.scalars().unique().all())

    topic_items: list[TopicActionItem] = []

    for index, topic in enumerate(topics, start=1):
        topic_items.append(
            TopicActionItem(
                topic_id=index,
                name=topic.code,
                display_name=topic.name,
            )
        )

    return topic_items


async def _resolve_topic_for_section(
    db: AsyncSession,
    section_code: str,
    topic_id: int,
) -> Topic:
    result = await db.execute(
        select(Topic)
        .join(Question)
        .where(Question.section == section_code)
        .order_by(Topic.name.asc())
    )
    topics = list(result.scalars().unique().all())

    if topic_id < 1 or topic_id > len(topics):
        raise HTTPException(status_code=404, detail="Topic not found")

    return topics[topic_id - 1]


async def set_selected_section(
    db: AsyncSession,
    student: User,
    section_id: int,
) -> SectionSelectionResponse:
    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    section_code = _section_code_for_id(section_id)
    await _upsert_selected_section(db=db, student=student, section_id=section_id)

    completed_section_sessions = await db.execute(
        select(func.count())
        .select_from(PracticeSession)
        .where(
            PracticeSession.student_id == student.id,
            PracticeSession.section_id == section_id,
            PracticeSession.mode == "section",
            PracticeSession.status == "completed",
        )
    )
    completed_count = completed_section_sessions.scalar_one()
    required_sessions = 3
    remaining_sessions = max(required_sessions - completed_count, 0)
    adaptive_is_locked = completed_count < required_sessions

    practice_options = [
        SectionPracticeOption(
            mode="section",
            title=f"{SECTION_DISPLAY_NAMES[section_code]} Section Practice",
            description=f"Practice questions across the full {SECTION_DISPLAY_NAMES[section_code]} section.",
            is_locked=False,
            question_count=settings.DEFAULT_PRACTICE_QUESTION_COUNT,
        ),
        SectionPracticeOption(
            mode="adaptive",
            title=f"Adaptive {SECTION_DISPLAY_NAMES[section_code]} Practice",
            description=f"Practice questions selected from your weakest {SECTION_DISPLAY_NAMES[section_code]} areas.",
            is_locked=adaptive_is_locked,
            question_count=settings.DEFAULT_PRACTICE_QUESTION_COUNT,
            unlock_requirement=(
                UnlockRequirement(
                    required_sessions=required_sessions,
                    completed_sessions=completed_count,
                    remaining_sessions=remaining_sessions,
                )
                if adaptive_is_locked
                else None
            ),
        ),
    ]

    topics = await _load_section_topics(db=db, section_code=section_code)

    return SectionSelectionResponse(
        practice_options=practice_options,
        topics=topics,
    )


def _public_question(question: Question, question_id: int) -> PublicQuestionResponse:
    return PublicQuestionResponse(
        question_id=question_id,
        prompt=question.prompt,
        choices=question.choices,
        section=question.section,
        topic_display_name=question.topic.name,
    )


async def _get_active_session_for_student(
    db: AsyncSession,
    student_id: int,
) -> PracticeSession:
    result = await db.execute(
        select(PracticeSession)
        .where(
            PracticeSession.student_id == student_id,
            PracticeSession.status.in_(["in_progress", "ready_to_complete"]),
        )
        .order_by(PracticeSession.created_at.desc())
        .limit(1)
    )
    session = result.scalar_one_or_none()

    if session is None:
        raise HTTPException(status_code=404, detail="No active practice session found")

    return session


async def _get_next_assigned_question(
    db: AsyncSession,
    session_id: int,
) -> PracticeSessionQuestion | None:
    result = await db.execute(
        select(PracticeSessionQuestion)
        .where(
            PracticeSessionQuestion.practice_session_id == session_id,
            PracticeSessionQuestion.status == "assigned",
        )
        .order_by(PracticeSessionQuestion.position.asc())
        .limit(1)
    )

    return result.scalar_one_or_none()


async def _load_question_with_topic(
    db: AsyncSession,
    question_id: int,
) -> Question:
    result = await db.execute(
        select(Question)
        .options(selectinload(Question.topic))
        .where(Question.id == question_id)
    )
    question = result.scalar_one_or_none()

    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    return question


async def start_practice_session(
    db: AsyncSession,
    request: PracticeStartRequest,
    student: User,
) -> PracticeStartResponse:
    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    existing_session_result = await db.execute(
        select(PracticeSession)
        .where(
            PracticeSession.student_id == student.id,
            PracticeSession.status.in_(["in_progress", "ready_to_complete"]),
        )
        .order_by(PracticeSession.created_at.desc())
        .limit(1)
    )
    active_session = existing_session_result.scalar_one_or_none()

    if active_session is not None:
        raise HTTPException(
            status_code=409,
            detail="A practice session is already in progress for this student.",
        )

    question_count = request.question_count or settings.DEFAULT_PRACTICE_QUESTION_COUNT
    selected_section_id = await _get_selected_section_id(db=db, student_id=student.id)
    topic_id_for_session: int | None = None

    question_query = select(Question).options(selectinload(Question.topic))

    if request.mode == "topic":
        if request.topic_id is None:
            raise HTTPException(
                status_code=400,
                detail="topic_id is required for topic mode",
            )

        if selected_section_id is None:
            raise HTTPException(
                status_code=400,
                detail="Select a section before starting topic practice",
            )

        section_code = _section_code_for_id(selected_section_id)
        topic = await _resolve_topic_for_section(
            db=db,
            section_code=section_code,
            topic_id=request.topic_id,
        )

        topic_id_for_session = topic.id
        question_query = question_query.where(Question.topic_id == topic.id)

    elif request.mode == "section":
        if selected_section_id is None:
            raise HTTPException(
                status_code=400,
                detail="Select a section before starting section practice",
            )

        question_query = question_query.where(
            Question.section == _section_code_for_id(selected_section_id)
        )

    elif request.mode == "adaptive":
        progress = await get_student_progress(db=db, student_id=student.id)
        weakest_topics = progress.get("weakest_topics", [])

        if weakest_topics:
            weakest_topic_id = weakest_topics[0]["topic_id"]
            topic_id_for_session = weakest_topic_id
            question_query = question_query.where(Question.topic_id == weakest_topic_id)
        else:
            if selected_section_id is None:
                raise HTTPException(
                    status_code=400,
                    detail="Select a section before starting adaptive practice",
                )

            question_query = question_query.where(
                Question.section == _section_code_for_id(selected_section_id)
            )

    question_result = await db.execute(
        question_query.order_by(func.random()).limit(question_count)
    )
    questions = list(question_result.scalars().unique().all())

    if not questions:
        raise HTTPException(
            status_code=400,
            detail="No questions available for this practice request. Run the seed script or add more questions.",
        )

    session = PracticeSession(
        student_id=student.id,
        topic_id=topic_id_for_session,
        section_id=selected_section_id if request.mode != "topic" else selected_section_id,
        title=f"{request.mode.title()} Practice Session",
        mode=request.mode,
        question_count=len(questions),
        status="in_progress",
    )

    db.add(session)
    await db.flush()

    for index, question in enumerate(questions, start=1):
        db.add(
            PracticeSessionQuestion(
                practice_session_id=session.id,
                question_id=question.id,
                position=index,
                status="assigned",
            )
        )

    await db.commit()

    first_session_question = await _get_next_assigned_question(db, session.id)

    if first_session_question is None:
        return PracticeStartResponse(
            status=session.status,
            mode=session.mode,
            total_questions=session.question_count,
            current_position=None,
            question=None,
        )

    first_question = await _load_question_with_topic(
        db=db,
        question_id=first_session_question.question_id,
    )

    return PracticeStartResponse(
        status=session.status,
        mode=session.mode,
        total_questions=session.question_count,
        current_position=first_session_question.position,
        question=_public_question(first_question, first_session_question.position),
    )


async def get_current_question(
    db: AsyncSession,
    student: User,
    question_id: int | None = None,
) -> PracticeQuestionResponse:
    session = await _get_active_session_for_student(db=db, student_id=student.id)

    if session.status not in {"in_progress", "ready_to_complete"}:
        return PracticeQuestionResponse(
            status=session.status,
            current_position=None,
            total_questions=session.question_count,
            question=None,
        )

    if question_id is None:
        session_question = await _get_next_assigned_question(db, session.id)
    else:
        session_question_result = await db.execute(
            select(PracticeSessionQuestion).where(
                PracticeSessionQuestion.practice_session_id == session.id,
                PracticeSessionQuestion.position == question_id,
            )
        )
        session_question = session_question_result.scalar_one_or_none()

        if session_question is None:
            raise HTTPException(status_code=404, detail="Question not found")

        if session_question.status != "assigned":
            raise HTTPException(
                status_code=400,
                detail="Question has already been answered",
            )

    if session_question is None:
        if session.status == "in_progress":
            session.status = "ready_to_complete"
            await db.commit()

        return PracticeQuestionResponse(
            status="ready_to_complete",
            current_position=None,
            total_questions=session.question_count,
            question=None,
        )

    question = await _load_question_with_topic(
        db=db,
        question_id=session_question.question_id,
    )

    return PracticeQuestionResponse(
        status=session.status,
        current_position=session_question.position,
        total_questions=session.question_count,
        question=_public_question(question, session_question.position),
    )


async def submit_answer(
    db: AsyncSession,
    student: User,
    request: SubmitAnswerRequest,
) -> SubmitAnswerResponse:
    session = await _get_active_session_for_student(db=db, student_id=student.id)

    if session.status != "in_progress":
        raise HTTPException(
            status_code=400,
            detail="Practice session is not accepting answers",
        )

    session_question = await _get_next_assigned_question(db=db, session_id=session.id)

    if session_question is None:
        raise HTTPException(
            status_code=400,
            detail="Practice session has no current question",
        )

    question = await db.get(Question, session_question.question_id)

    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    if request.selected_answer is not None and request.selected_answer not in question.choices:
        raise HTTPException(status_code=400, detail="Selected answer is invalid for this question")

    selected_answer = request.selected_answer
    is_correct = selected_answer == question.correct_answer

    mistake_type = classify_mistake_type(
        selected_answer=selected_answer,
        is_correct=is_correct,
        time_spent_seconds=request.time_spent_seconds,
        confidence_level=request.confidence_level,
    )

    attempt = Attempt(
        practice_session_id=session.id,
        student_id=session.student_id,
        question_id=question.id,
        topic_id=question.topic_id,
        selected_answer=selected_answer,
        correct_answer=question.correct_answer,
        is_correct=is_correct,
        time_spent_seconds=request.time_spent_seconds,
        confidence_level=request.confidence_level,
        mistake_type=mistake_type,
    )

    db.add(attempt)

    session_question.status = "answered"
    session_question.answered_at = datetime.now(timezone.utc)

    # autoflush is disabled on this session (see app/core/database.py), so the
    # status change above must be flushed explicitly before the COUNT query
    # below, or it undercounts answered questions by one on every submission.
    await db.flush()

    remaining_result = await db.execute(
        select(func.count())
        .select_from(PracticeSessionQuestion)
        .where(
            PracticeSessionQuestion.practice_session_id == session.id,
            PracticeSessionQuestion.status == "assigned",
        )
    )
    remaining_questions = remaining_result.scalar_one()

    if remaining_questions == 0:
        session.status = "ready_to_complete"

    await db.commit()
    await db.refresh(attempt)

    return SubmitAnswerResponse(
        saved=True,
        answered_position=session_question.position,
        remaining_questions=remaining_questions,
    )


async def get_next_question(
    db: AsyncSession,
    student: User,
) -> PracticeQuestionResponse:
    return await get_current_question(db=db, student=student)


async def complete_practice_session(
    db: AsyncSession,
    student: User,
) -> PracticeCompleteResponse:
    session = await _get_active_session_for_student(db=db, student_id=student.id)

    attempts_result = await db.execute(
        select(Attempt).where(Attempt.practice_session_id == session.id)
    )
    attempts = list(attempts_result.scalars().all())

    if not attempts:
        raise HTTPException(
            status_code=400,
            detail="Cannot complete a session with no answers",
        )

    session.status = "completed"

    correct = sum(1 for attempt in attempts if attempt.is_correct)
    incorrect = len(attempts) - correct
    await db.commit()

    total = len(attempts)
    percentage = round((correct / total) * 100, 1) if total else 0.0

    confidence_values = [
        attempt.confidence_level for attempt in attempts if attempt.confidence_level is not None
    ]
    average_confidence = (
        round(sum(confidence_values) / len(confidence_values), 1) if confidence_values else None
    )

    breakdown_result = await db.execute(
        select(PracticeSessionQuestion, Attempt, Question)
        .join(
            Attempt,
            (Attempt.question_id == PracticeSessionQuestion.question_id)
            & (Attempt.practice_session_id == PracticeSessionQuestion.practice_session_id),
        )
        .join(Question, Question.id == PracticeSessionQuestion.question_id)
        .options(selectinload(Question.topic))
        .where(PracticeSessionQuestion.practice_session_id == session.id)
        .order_by(PracticeSessionQuestion.position.asc())
    )

    question_breakdown = [
        QuestionBreakdownItem(
            question_id=question.id,
            topic_display_name=question.topic.name,
            prompt=question.prompt,
            choices=question.choices,
            correct_answer=attempt.correct_answer,
            selected_answer=attempt.selected_answer,
            is_correct=attempt.is_correct,
            confidence_level=attempt.confidence_level,
            explanation=question.explanation,
        )
        for _session_question, attempt, question in breakdown_result.all()
    ]

    section_code = SECTION_CODES.get(session.section_id) if session.section_id else None
    section_display_name = (
        SECTION_DISPLAY_NAMES.get(section_code) if section_code is not None else None
    )

    adaptive_unlock: AdaptiveUnlockResponse | None = None

    if session.mode == "section" and session.section_id is not None:
        completed_section_sessions = await db.execute(
            select(func.count())
            .select_from(PracticeSession)
            .where(
                PracticeSession.student_id == student.id,
                PracticeSession.section_id == session.section_id,
                PracticeSession.mode == "section",
                PracticeSession.status == "completed",
            )
        )
        completed_count = completed_section_sessions.scalar_one()
        required_sessions = 3

        adaptive_unlock = AdaptiveUnlockResponse(
            is_unlocked=completed_count >= required_sessions,
            completed_sessions=completed_count,
            required_sessions=required_sessions,
            remaining_sessions=max(required_sessions - completed_count, 0),
        )

    await generate_study_plan_for_student(
        db=db,
        student_id=session.student_id,
    )

    return PracticeCompleteResponse(
        status="completed",
        score=ScoreSummary(
            correct=correct,
            incorrect=incorrect,
            total=total,
            percentage=percentage,
        ),
        adaptive_unlock=adaptive_unlock,
        average_confidence=average_confidence,
        question_breakdown=question_breakdown,
        section=section_code,
        section_display_name=section_display_name,
    )