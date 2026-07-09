import uuid
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.question import QuestionCreate, QuestionResponse

router = APIRouter()

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(question_in: QuestionCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new SAT question.
    """
    now = datetime.now(timezone.utc)
    return QuestionResponse(
        id=uuid.uuid4(),
        prompt=question_in.prompt,
        choices=question_in.choices,
        correct_answer=question_in.correct_answer,
        explanation=question_in.explanation,
        difficulty=question_in.difficulty,
        topic_id=question_in.topic_id,
        created_at=now,
        updated_at=now
    )

@router.get("", response_model=List[QuestionResponse])
async def list_questions(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """
    List SAT questions.
    """
    now = datetime.now(timezone.utc)
    return [
        QuestionResponse(
            id=uuid.uuid4(),
            prompt="What is 2x + 5 = 15 solved for x?",
            choices={"A": "3", "B": "5", "C": "8", "D": "10"},
            correct_answer="B",
            explanation="Subtract 5 from both sides to get 2x = 10, then divide by 2 to find x = 5.",
            difficulty="Easy",
            topic_id=1,
            created_at=now,
            updated_at=now
        )
    ]
