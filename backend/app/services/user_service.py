"""User profile business logic.

Kept out of auth_service.py, which is dedicated to credential/token flows
(email verification, password reset); editing your display name is a
user-domain concern that happens to be reachable from the auth router because
it reads and writes the same session user as GET /auth/me.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user import user_repository


def compose_full_name(first_name: str, last_name: str) -> str:
    """Join the two name parts into the single `full_name` column the User
    model stores. Empty parts are dropped so a mononym doesn't get a trailing
    space (which would then round-trip back into the client's name splitter).
    """
    return " ".join(part for part in (first_name.strip(), last_name.strip()) if part)


async def update_user_profile(
    db: AsyncSession,
    *,
    user: User,
    first_name: str,
    last_name: str,
) -> User:
    """Persist a new display name for `user` and return the updated row."""
    return await user_repository.update(
        db=db,
        db_obj=user,
        obj_in={"full_name": compose_full_name(first_name, last_name)},
    )
