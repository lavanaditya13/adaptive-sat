import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.practice_session import PracticeSessionCreate, PracticeSessionResponse

router = APIRouter()

@router.post("", response_model=PracticeSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_practice_session(session_in: PracticeSessionCreate, db: AsyncSession = Depends(get_db)):
    """
    Start a new practice session for a student.
    """
    now = datetime.now(timezone.utc)
    return PracticeSessionResponse(
        id=uuid.uuid4(),
        student_id=session_in.student_id,
        title=session_in.title,
        status="started",
        created_at=now,
        updated_at=now
    )

@router.get("", response_model=List[PracticeSessionResponse])
async def list_practice_sessions(student_id: Optional[uuid.UUID] = None, db: AsyncSession = Depends(get_db)):
    """
    List practice sessions, optionally filtered by student_id.
    """
    now = datetime.now(timezone.utc)
    return [
        PracticeSessionResponse(
            id=uuid.uuid4(),
            student_id=student_id or uuid.uuid4(),
            title="Math Practice Session 1",
            status="started",
            created_at=now,
            updated_at=now
        )
    ]
