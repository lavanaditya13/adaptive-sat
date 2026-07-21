import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.schemas.attempt import AttemptCreate, AttemptResponse
from app.services.skill_scoring_service import classify_mistake_type

router = APIRouter()


@router.post("", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)
async def create_attempt(
    payload: AttemptCreate,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(PracticeSession, payload.practice_session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")

    if session.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot add attempt to completed session")

    question = await db.get(Question, payload.question_id)

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct = payload.selected_answer == question.correct_answer

    mistake_type = classify_mistake_type(
        selected_answer=payload.selected_answer,
        is_correct=is_correct,
        time_spent_seconds=payload.time_spent_seconds,
        confidence_level=payload.confidence_level,
    )

    attempt = Attempt(
        practice_session_id=payload.practice_session_id,
        student_id=session.student_id,
        question_id=payload.question_id,
        topic_id=question.topic_id,
        selected_answer=payload.selected_answer,
        correct_answer=question.correct_answer,
        is_correct=is_correct,
        time_spent_seconds=payload.time_spent_seconds,
        confidence_level=payload.confidence_level,
        mistake_type=mistake_type,
    )

    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return attempt


@router.get("", response_model=list[AttemptResponse])
async def list_attempts(
    practice_session_id: uuid.UUID | None = None,
    student_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Attempt)

    if practice_session_id:
        query = query.where(Attempt.practice_session_id == practice_session_id)

    if student_id:
        query = query.where(Attempt.student_id == student_id)

    query = query.order_by(Attempt.created_at.desc())

    result = await db.execute(query)

    return result.scalars().all()


@router.get("/session/{session_id}", response_model=list[AttemptResponse])
async def get_attempts_by_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt)
        .where(Attempt.practice_session_id == session_id)
        .order_by(Attempt.created_at)
    )

    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[AttemptResponse])
async def get_attempts_by_student(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Attempt)
        .where(Attempt.student_id == student_id)
        .order_by(Attempt.created_at.desc())
    )

    return result.scalars().all()