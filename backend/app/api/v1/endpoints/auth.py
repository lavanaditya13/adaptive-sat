from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_session_token, verify_password
from app.repositories.user import user_repository
from app.schemas.auth import (
    AuthUserResponse,
    LoginRequest,
    LoginResponse,
    SignupRequest,
)

router = APIRouter()


@router.post(
    "/signup",
    response_model=AuthUserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup(
    user_in: SignupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user."""
    existing_user = await user_repository.get_by_email(
        db,
        email=user_in.email,
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    try:
        new_user = await user_repository.create_user(
            db,
            obj_in=user_in,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password format",
        ) from exc

    return AuthUserResponse(
        user_id=str(new_user.id),
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate a user and set a session cookie."""
    user = await user_repository.get_by_email(
        db,
        email=credentials.email,
    )

    if not user or not verify_password(
        credentials.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if credentials.role and user.role != credentials.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    session_token = create_session_token(user.id)
    is_production = settings.ENVIRONMENT == "production"

    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        path="/",
    )

    return LoginResponse(
        user=AuthUserResponse(
            user_id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
        ),
    )