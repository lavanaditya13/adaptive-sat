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
    resend_verification_email,
    verify_email,
    VerificationTokenExpiredError,
    VerificationTokenInvalidError,
)
from app.services.oauth_service import (
    OAuthConfigurationError,
    OAuthProviderError,
    OAuthStateExpiredError,
    OAuthStateInvalidError,
    build_apple_authorization_url,
    build_google_authorization_url,
    complete_apple_oauth,
    complete_google_oauth,
)
from app.schemas.auth import (
    AuthUserResponse,
    AuthResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
    SignupRequest,
    VerifyEmailRequest,
)

router = APIRouter()


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

    await issue_signup_verification_email(new_user)

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


@router.get("/apple")
async def apple_start(
    intent: str = Query(default="login", pattern="^(login|signup|link)$"),
):
    try:
        apple_url = build_apple_authorization_url(intent=intent)
    except OAuthConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return RedirectResponse(url=apple_url, status_code=status.HTTP_302_FOUND)


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
        user = await complete_google_oauth(db, code=code, state=state)
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


@router.api_route("/apple/callback", methods=["GET", "POST"])
async def apple_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")
    user_payload = request.query_params.get("user")

    if request.method == "POST":
        form = await request.form()
        code = form.get("code") or code
        state = form.get("state") or state
        error = form.get("error") or error
        user_payload = form.get("user") or user_payload

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
        user = await complete_apple_oauth(
            db,
            code=str(code),
            state=str(state),
            user_payload=str(user_payload) if user_payload else None,
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