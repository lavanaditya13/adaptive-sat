from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings

# NullPool: DATABASE_URL is Neon's pooled (PgBouncer) endpoint, which already
# handles connection pooling server-side. SQLAlchemy's default pool would add
# a second, client-side pool on top of it — on Vercel, a "warm" serverless
# instance can keep that local pool alive across invocations, but Neon can
# close the underlying server-side connection while it sits idle in between,
# leaving a stale connection SQLAlchemy hands out without checking (surfaces
# as `asyncpg.exceptions.InterfaceError: connection is closed`). NullPool
# opens a fresh connection per checkout instead of reusing one, which is safe
# here since PgBouncer makes that cheap.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True if settings.ENVIRONMENT == "development" else False,
    future=True,
    poolclass=NullPool,
)

# Async session factory
SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

# Declarative base for SQLAlchemy models
class Base(DeclarativeBase):
    pass

# Dependency to yield an async database session for FastAPI endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
