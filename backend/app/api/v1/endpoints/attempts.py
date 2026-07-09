import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.attempt import AttemptCreate, AttemptResponse

router = APIRouter()

@router.post("", response_model=AttemptResponse, status_code=status.HTTP_201_CREATED)
async def create_attempt(attempt_in: AttemptCreate, db: AsyncSession = Depends(get_db)):
    """
    Log an answer attempt for a question in a practice session.
    """
    now = datetime.now(timezone.utc)
    # Stub response: check accuracy in a very basic way for testing
    is_correct = True
    return AttemptResponse(
        id=uuid.uuid4(),
        practice_session_id=attempt_in.practice_session_id,
        question_id=attempt_in.question_id,
        selected_answer=attempt_in.selected_answer,
        is_correct=is_correct,
        time_spent_seconds=attempt_in.time_spent_seconds,
        confidence_level=attempt_in.confidence_level,
        mistake_type=None,
        created_at=now
    )

@router.get("", response_model=List[AttemptResponse])
async def list_attempts(practice_session_id: Optional[uuid.UUID] = None, db: AsyncSession = Depends(get_db)):
    """
    List attempts, optionally filtered by practice_session_id.
    """
    now = datetime.now(timezone.utc)
    return [
        AttemptResponse(
            id=uuid.uuid4(),
            practice_session_id=practice_session_id or uuid.uuid4(),
            question_id=uuid.uuid4(),
            selected_answer="A",
            is_correct=False,
            time_spent_seconds=45,
            confidence_level=3,
            mistake_type="calculation",
            created_at=now
        )
    ]
