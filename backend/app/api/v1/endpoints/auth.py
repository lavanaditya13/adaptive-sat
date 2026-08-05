import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, verify_password
from app.models.user import User
from app.repositories.user import user_repository
from app.services.auth_service import (
    issue_signup_verification_email,
    resend_verification_email_by_address,
    resend_verification_email,
    verify_email,
    VerificationTokenExpiredError,
    VerificationTokenInvalidError,
)
from app.services.oauth_service import (
    OAuthConfigurationError,
    OAuthProviderConflictError,
    OAuthProviderError,
    OAuthStateExpiredError,
    OAuthStateInvalidError,
    build_google_authorization_url,
    complete_google_oauth,
    get_oauth_intent,
)
from app.schemas.auth import (
    AuthUserResponse,
    AuthResponse,
    LoginRequest,
    LoginResponse,
    ResendVerificationByEmailRequest,
    RefreshRequest,
    RefreshResponse,
    SignupRequest,
    VerifyEmailRequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _frontend_oauth_callback_url(status_value: str | None = None, reason: str | None = None) -> str:
    base_url = settings.FRONTEND_URL.rstrip("/")
    if status_value == "error":
        return f"{base_url}/oauth/callback?status=error&reason={reason or 'provider_error'}"
    return f"{base_url}/oauth/callback"


def _issue_session(response: Response, user: User) -> LoginResponse:
    """Issue an access token, set the session cookie, and build the auth response."""
    access_token = create_access_token(user.id)
    is_production = settings.ENVIRONMENT == "production"

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=AuthUserResponse(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            email_verified=user.email_verified,
            oauth_provider=user.oauth_provider,
        ),
    )


@router.post(
    "/signup",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup(
    user_in: SignupRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user and start a session for them."""
    existing_user = await user_repository.get_by_email(
        db,
        email=user_in.email,
    )

    if existing_user:
        if existing_user.oauth_provider and not existing_user.hashed_password:
            provider = existing_user.oauth_provider.capitalize()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This email is registered via {provider} - sign in with {provider} instead.",
            )

        if not existing_user.email_verified and existing_user.hashed_password:
            try:
                await issue_signup_verification_email(existing_user)
            except Exception:
                logger.exception(
                    "Resend verification on duplicate unverified signup failed",
                    extra={"email": user_in.email},
                )

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "account_unverified",
                    "message": "Account exists but is not verified. Check your email.",
                },
            )

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

    try:
        await issue_signup_verification_email(new_user)
    except Exception:
        # Best-effort email on signup: never fail account creation/session issuance.
        logger.exception(
            "Signup verification email failed",
            extra={"email": new_user.email, "user_id": new_user.id},
        )

    return _issue_session(response, new_user)


@router.get("/google")
async def google_start(
    intent: str = Query(default="login", pattern="^(login|signup|link)$"),
):
    try:
        google_url = build_google_authorization_url(intent=intent)
    except OAuthConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return RedirectResponse(url=google_url, status_code=status.HTTP_302_FOUND)


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate a user and issue an access token."""
    user = await user_repository.get_by_email(
        db,
        email=credentials.email,
    )

    if not user or not user.hashed_password or not verify_password(
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

    return _issue_session(response, user)


@router.get("/me", response_model=AuthUserResponse)
async def me(current_user: User = Depends(get_current_user)):
    """Return the current session's user, used by the frontend to check auth on load."""
    return AuthUserResponse(
        user_id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        email_verified=current_user.email_verified,
        oauth_provider=current_user.oauth_provider,
    )


@router.post("/verify-email", response_model=AuthResponse)
async def verify_email_endpoint(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        user = await verify_email(db, payload.token)
    except VerificationTokenExpiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except VerificationTokenInvalidError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return AuthResponse(
        user=AuthUserResponse(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            email_verified=user.email_verified,
            oauth_provider=user.oauth_provider,
        )
    )


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if error:
        reason = "access_denied" if error == "access_denied" else "provider_error"
        return RedirectResponse(
            url=_frontend_oauth_callback_url(status_value="error", reason=reason),
            status_code=status.HTTP_302_FOUND,
        )

    if not code or not state:
        return RedirectResponse(
            url=_frontend_oauth_callback_url(status_value="error", reason="provider_error"),
            status_code=status.HTTP_302_FOUND,
        )

    try:
        intent = get_oauth_intent(state, provider="google")
        linking_user: User | None = None

        if intent == "link":
            try:
                linking_user = await get_current_user(
                    access_token=request.cookies.get("access_token"),
                    db=db,
                )
            except HTTPException:
                return RedirectResponse(
                    url=_frontend_oauth_callback_url(status_value="error", reason="provider_error"),
                    status_code=status.HTTP_302_FOUND,
                )

        user = await complete_google_oauth(
            db,
            code=code,
            state=state,
            current_user=linking_user,
        )
    except OAuthProviderConflictError:
        return RedirectResponse(
            url=_frontend_oauth_callback_url(status_value="error", reason="email_conflict"),
            status_code=status.HTTP_302_FOUND,
        )
    except (OAuthStateExpiredError, OAuthStateInvalidError, OAuthProviderError):
        return RedirectResponse(
            url=_frontend_oauth_callback_url(status_value="error", reason="provider_error"),
            status_code=status.HTTP_302_FOUND,
        )

    redirect_response = RedirectResponse(
        url=_frontend_oauth_callback_url(),
        status_code=status.HTTP_302_FOUND,
    )
    _issue_session(redirect_response, user)
    return redirect_response


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
async def resend_verification(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await resend_verification_email(db, current_user)


@router.post("/resend-verification-by-email", status_code=status.HTTP_204_NO_CONTENT)
async def resend_verification_by_email(
    payload: ResendVerificationByEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Unauthenticated resend endpoint used by signup/login recovery UX.

    Always returns 204 to avoid account enumeration.
    """
    try:
        await resend_verification_email_by_address(db, payload.email)
    except Exception:
        logger.exception(
            "Resend verification by email failed",
            extra={"email": payload.email},
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """Clear the session cookie."""
    response.delete_cookie(key="access_token", path="/")


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    refresh_in: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Issue a new access token from a valid refresh token."""
    from jose import JWTError, jwt

    from app.core.security import ALGORITHM

    try:
        payload = jwt.decode(
            refresh_in.refresh_token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    new_access_token = create_access_token(user_id)

    return RefreshResponse(
        access_token=new_access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )