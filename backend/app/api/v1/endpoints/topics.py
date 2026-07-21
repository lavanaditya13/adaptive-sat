import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.topic import Topic
from app.schemas.topic import TopicCreate, TopicResponse

router = APIRouter()


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    payload: TopicCreate,
    db: AsyncSession = Depends(get_db),
):
    if payload.parent_topic_id:
        parent = await db.get(Topic, payload.parent_topic_id)

        if not parent:
            raise HTTPException(status_code=404, detail="Parent topic not found")

    result = await db.execute(select(Topic).where(Topic.code == payload.code))
    existing_topic = result.scalar_one_or_none()

    if existing_topic:
        raise HTTPException(status_code=400, detail="Topic code already exists")

    topic = Topic(**payload.model_dump())

    db.add(topic)
    await db.commit()
    await db.refresh(topic)

    return topic


@router.get("", response_model=list[TopicResponse])
async def list_topics(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Topic)
        .order_by(Topic.name)
        .offset(skip)
        .limit(limit)
    )

    return result.scalars().all()


@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    topic = await db.get(Topic, topic_id)

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    return topic


@router.get("/{topic_id}/children", response_model=list[TopicResponse])
async def get_topic_children(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    topic = await db.get(Topic, topic_id)

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    result = await db.execute(
        select(Topic)
        .where(Topic.parent_topic_id == topic_id)
        .order_by(Topic.name)
    )

    return result.scalars().all()