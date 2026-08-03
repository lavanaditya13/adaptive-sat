from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.user import user_repository
from app.schemas.settings import ConnectedProviderItem, ConnectedProvidersResponse
from app.services.oauth_service import (
    OAuthConfigurationError,
    build_google_authorization_url,
)

router = APIRouter()


@router.get("/connected-providers", response_model=ConnectedProvidersResponse)
async def get_connected_providers(
    current_user: User = Depends(get_current_user),
):
    providers: list[ConnectedProviderItem] = []

    if current_user.oauth_provider:
        linked_at = current_user.updated_at.astimezone(timezone.utc)
        providers.append(
            ConnectedProviderItem(
                provider=current_user.oauth_provider,
                linked_at=linked_at,
                email=current_user.email,
            )
        )

    return ConnectedProvidersResponse(
        providers=providers,
        has_password=bool(current_user.hashed_password),
    )


@router.get("/connected-providers/{provider}/start")
async def start_provider_link(
    provider: str = Path(..., pattern="^(google)$"),
    intent: str = Query(default="link", pattern="^(link)$"),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    try:
        url = build_google_authorization_url(intent=intent)
        return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    except OAuthConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.delete("/connected-providers/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_provider(
    provider: str = Path(..., pattern="^(google)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.oauth_provider != provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider is not linked to this account.",
        )

    has_password = bool(current_user.hashed_password)
    if not has_password:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot unlink your only sign-in method.",
        )

    await user_repository.update(
        db=db,
        db_obj=current_user,
        obj_in={
            "oauth_provider": None,
            "oauth_id": None,
        },
    )
