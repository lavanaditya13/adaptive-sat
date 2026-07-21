import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.attempt import Attempt
from app.models.practice_session import PracticeSession
from app.models.question import Question
from app.models.topic import Topic
from app.models.user import User
from app.schemas.practice_session import (
    PracticeSessionCreate,
    PracticeSessionResponse,
    PracticeSessionWithQuestionsResponse,
)

router = APIRouter()


@router.post(
    "",
    response_model=PracticeSessionWithQuestionsResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_practice_session(
    payload: PracticeSessionCreate,
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(User, payload.student_id)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    if payload.topic_id:
        topic = await db.get(Topic, payload.topic_id)

        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")

    question_query = select(Question)

    if payload.topic_id:
        question_query = question_query.where(Question.topic_id == payload.topic_id)

    question_query = question_query.limit(payload.question_count)

    result = await db.execute(question_query)
    questions = result.scalars().all()

    if not questions:
        raise HTTPException(status_code=400, detail="No questions available for this session")

    session = PracticeSession(
        student_id=payload.student_id,
        topic_id=payload.topic_id,
        title=payload.title or "Practice Session",
        status="in_progress",
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "session": session,
        "questions": questions,
    }


@router.get("", response_model=list[PracticeSessionResponse])
async def list_practice_sessions(
    student_id: uuid.UUID | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(PracticeSession)

    if student_id:
        query = query.where(PracticeSession.student_id == student_id)

    query = query.order_by(PracticeSession.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)

    return result.scalars().all()


@router.get("/student/{student_id}", response_model=list[PracticeSessionResponse])
async def get_student_sessions(
    student_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    student = await db.get(User, student_id)

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    result = await db.execute(
        select(PracticeSession)
        .where(PracticeSession.student_id == student_id)
        .order_by(PracticeSession.created_at.desc())
    )

    return result.scalars().all()


@router.get("/{session_id}")
async def get_practice_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(PracticeSession, session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")

    attempts_result = await db.execute(
        select(Attempt)
        .where(Attempt.practice_session_id == session_id)
        .order_by(Attempt.created_at)
    )

    attempts = attempts_result.scalars().all()

    return {
        "session": session,
        "attempts": attempts,
    }


@router.post("/{session_id}/complete")
async def complete_practice_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(PracticeSession, session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Practice session not found")

    result = await db.execute(
        select(Attempt).where(Attempt.practice_session_id == session_id)
    )

    attempts = result.scalars().all()

    total_attempted = len(attempts)
    total_correct = sum(1 for attempt in attempts if attempt.is_correct)
    accuracy = total_correct / total_attempted if total_attempted else 0

    session.status = "completed"

    await db.commit()
    await db.refresh(session)

    return {
        "session_id": str(session.id),
        "status": session.status,
        "total_attempted": total_attempted,
        "total_correct": total_correct,
        "accuracy": round(accuracy, 2),
    }