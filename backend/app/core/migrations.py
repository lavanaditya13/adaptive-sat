import logging
from pathlib import Path

import psycopg2
from alembic import command
from alembic.config import Config

from app.core.config import settings

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ALEMBIC_SCRIPT_LOCATION = BACKEND_DIR / "alembic"

# Arbitrary fixed key so every process/instance contends for the same
# advisory lock, scoped to this app (not a real object id).
_MIGRATION_LOCK_KEY = 875_309_001


def run_pending_migrations() -> None:
    """Apply any pending Alembic migrations against the configured database.

    Runs on every app startup (see the FastAPI lifespan in app.main) so a
    deploy that ships a new migration can never again leave the running app
    pointed at a stale schema. Serialized via a non-blocking Postgres
    advisory lock: if another cold-starting instance already holds it, this
    call just skips rather than blocking the whole request pipeline —
    `alembic upgrade head` is idempotent, so the next cold start (or the
    instance currently holding the lock) converges the schema regardless.
    """
    sync_url = (
        settings.SYNC_DATABASE_URL
        or settings.DATABASE_URL.replace("+asyncpg", "")
    )

    if not sync_url:
        logger.warning("No database URL configured; skipping migrations.")
        return

    conn = psycopg2.connect(sync_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT pg_try_advisory_lock(%s)", (_MIGRATION_LOCK_KEY,))
            acquired = cur.fetchone()[0]

            if not acquired:
                logger.info(
                    "Migration lock held by another instance; skipping this run."
                )
                return

            try:
                alembic_cfg = Config()
                alembic_cfg.set_main_option(
                    "script_location", str(ALEMBIC_SCRIPT_LOCATION)
                )
                command.upgrade(alembic_cfg, "head")
                logger.info("Database schema is up to date.")
            finally:
                cur.execute("SELECT pg_advisory_unlock(%s)", (_MIGRATION_LOCK_KEY,))
    finally:
        conn.close()
