from typing import List
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter()

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new user.
    """
    now = datetime.now(timezone.utc)
    return UserResponse(
        id=uuid.uuid4(),
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=True,
        created_at=now,
        updated_at=now
    )

@router.get("", response_model=List[UserResponse])
async def list_users(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """
    List all users.
    """
    now = datetime.now(timezone.utc)
    return [
        UserResponse(
            id=uuid.uuid4(),
            email="student@example.com",
            full_name="Sample Student",
            role="student",
            is_active=True,
            created_at=now,
            updated_at=now
        )
    ]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Get a specific user by ID.
    """
    now = datetime.now(timezone.utc)
    return UserResponse(
        id=user_id,
        email="student@example.com",
        full_name="Sample Student",
        role="student",
        is_active=True,
        created_at=now,
        updated_at=now
    )
