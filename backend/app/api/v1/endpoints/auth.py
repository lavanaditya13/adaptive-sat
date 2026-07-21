from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.repositories.user import user_repository
from app.schemas.auth import SignupRequest, LoginRequest, AuthResponse, RefreshRequest, RefreshResponse

router = APIRouter()

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_in: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new user (student, parent, or tutor).
    """
    existing_user = await user_repository.get_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create the user in the database
    new_user = await user_repository.create_user(db, obj_in=user_in)
    
    # Generate tokens
    access_token = create_access_token(new_user.id)
    refresh_token = create_access_token(new_user.id, expires_delta=timedelta(days=30))
    
    return AuthResponse(
        user=new_user,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/login", response_model=AuthResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user credentials and return access & refresh JWT tokens.
    """
    user = await user_repository.get_by_email(db, email=credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_access_token(user.id, expires_delta=timedelta(days=30))
    
    return AuthResponse(
        user=user,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/refresh", response_model=RefreshResponse)
async def refresh(refresh_in: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """
    Refresh access token using a valid refresh token.
    """
    from jose import jwt, JWTError
    from app.core.security import ALGORITHM
    
    try:
        payload = jwt.decode(refresh_in.refresh_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
        
    new_access_token = create_access_token(user_id)
    return RefreshResponse(
        access_token=new_access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
