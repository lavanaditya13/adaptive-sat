from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.constants import IdempotentEndpoint
from app.models.idempotency_key import IdempotencyKey
from app.repositories.base import BaseRepository


class IdempotencyKeyRepository(BaseRepository[IdempotencyKey]):
    def __init__(self):
        super().__init__(IdempotencyKey)

    async def get_by_scope(
        self,
        db: AsyncSession,
        *,
        student_id: int,
        endpoint: IdempotentEndpoint,
        key: str,
    ) -> Optional[IdempotencyKey]:
        """Fetch the reservation row for one (student, endpoint, key) --
        the same scope uq_idempotency_keys_scope enforces uniqueness on.
        """
        result = await db.execute(
            select(IdempotencyKey).where(
                IdempotencyKey.student_id == student_id,
                IdempotencyKey.endpoint == endpoint,
                IdempotencyKey.key == key,
            )
        )
        return result.scalar_one_or_none()


idempotency_key_repository = IdempotencyKeyRepository()
