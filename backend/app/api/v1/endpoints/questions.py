import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.question import Question
from app.models.topic import Topic
from app.schemas.question import QuestionCreate, QuestionResponse

router = APIRouter()


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    payload: QuestionCreate,
    db: AsyncSession = Depends(get_db),
):
    topic = await db.get(Topic, payload.topic_id)

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    question = Question(**payload.model_dump())

    db.add(question)
    await db.commit()
    await db.refresh(question)

    return question


@router.get("", response_model=list[QuestionResponse])
async def list_questions(
    topic_id: uuid.UUID | None = None,
    difficulty: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Question)

    if topic_id:
        query = query.where(Question.topic_id == topic_id)

    if difficulty:
        query = query.where(Question.difficulty == difficulty)

    query = query.offset(skip).limit(limit)

    result = await db.execute(query)

    return result.scalars().all()


@router.get("/by-topic/{topic_id}", response_model=list[QuestionResponse])
async def get_questions_by_topic(
    topic_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    topic = await db.get(Topic, topic_id)

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    result = await db.execute(
        select(Question)
        .where(Question.topic_id == topic_id)
        .limit(limit)
    )

    return result.scalars().all()


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    question = await db.get(Question, question_id)

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    return question