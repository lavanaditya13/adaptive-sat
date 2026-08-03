from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.security import get_password_hash
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        """
        Fetch a user by email address.
        """
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_user(self, db: AsyncSession, *, obj_in) -> User:
        """
        Create a user with either password credentials or OAuth identity.
        """
        raw_password = getattr(obj_in, "password", None)
        hashed_password = get_password_hash(raw_password) if raw_password else None

        db_obj = User(
            email=obj_in.email,
            hashed_password=hashed_password,
            full_name=obj_in.full_name,
            role=obj_in.role,
            is_active=getattr(obj_in, "is_active", True),
            email_verified=getattr(obj_in, "email_verified", False),
            oauth_provider=getattr(obj_in, "oauth_provider", None),
            oauth_id=getattr(obj_in, "oauth_id", None),
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


user_repository = UserRepository()
