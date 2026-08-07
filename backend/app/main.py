import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.migrations import run_pending_migrations

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Alembic's env.py calls asyncio.run() internally, which can't run
    # inside this already-running event loop — offload to a thread.
    #
    # Migration failure (e.g. a stale/misconfigured DATABASE_URL) must not
    # take the whole app down: Starlette aborts startup entirely if lifespan
    # raises, which 500s every route on every request until someone
    # notices — far worse than booting with a possibly-stale schema and
    # letting individual DB-touching endpoints fail normally.
    try:
        await asyncio.to_thread(run_pending_migrations)
    except Exception:
        logger.exception("Startup migrations failed; continuing without them.")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    description="Backend API for Adaptive SAT Learning Platform",
    lifespan=lifespan,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} API.",
        "documentation": f"{settings.API_V1_STR}/docs"
    }


@app.get("/api/_diag_db_check_temp")
async def _diag_db_check_temp():
    import os
    import psycopg2

    results = {}
    for name in (
        "DATABASE_URL",
        "ADDED_DATABASE_URL",
        "DATABASE_URL_UNPOOLED",
        "ADDED_DATABASE_URL_UNPOOLED",
    ):
        val = os.environ.get(name)
        if not val:
            results[name] = "unset"
            continue
        sync_val = val.replace("postgresql+asyncpg://", "postgresql://")
        try:
            conn = psycopg2.connect(sync_val, connect_timeout=5)
            conn.close()
            results[name] = "ok"
        except Exception as exc:
            results[name] = f"failed: {type(exc).__name__}"
    return results
