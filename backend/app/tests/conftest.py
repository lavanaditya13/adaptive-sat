"""Shared fixtures for backend tests.

Most existing tests in this package call service/endpoint functions directly
with mocked repositories (see test_auth_regression.py) and never touch a real
database. That's fine for auth plumbing, but the core practice -> scoring ->
recommendation pipeline (see practice_service.py, skill_scoring_service.py,
recommendation_service.py) shares persisted state across those three files,
so a mocked test can't catch a break in how one of them reads what another
wrote -- only a real database can.

This module points DATABASE_URL/SYNC_DATABASE_URL at a dedicated
`adaptive_sat_test` database (never the dev database) unless the environment
already specifies one (CI sets these explicitly to point at its Postgres
service container). DB-backed tests skip cleanly via `_skip_without_postgres`
if no Postgres is reachable, so `pytest` still works with nothing running
locally.
"""

import os

_DEFAULT_TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/adaptive_sat_test"
_DEFAULT_TEST_SYNC_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/adaptive_sat_test"

# Must run before anything imports app.core.config, which builds the
# process-wide `settings` singleton (and the engine bound to it) at import
# time. conftest.py is always imported before test modules are collected, so
# this is the last safe place to set these.
os.environ.setdefault("DATABASE_URL", _DEFAULT_TEST_DATABASE_URL)
os.environ.setdefault("SYNC_DATABASE_URL", _DEFAULT_TEST_SYNC_DATABASE_URL)
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ENVIRONMENT", "test")

from urllib.parse import urlsplit, urlunsplit  # noqa: E402

import psycopg2  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.core.migrations import run_pending_migrations  # noqa: E402


def _target_sync_url() -> str:
    return settings.SYNC_DATABASE_URL or settings.DATABASE_URL.replace("+asyncpg", "")


def _admin_sync_url() -> str:
    # Connect to the default `postgres` maintenance database to check for /
    # create the test database itself -- you can't CREATE DATABASE while
    # connected to the database you're creating.
    parsed = urlsplit(_target_sync_url())
    return urlunsplit((parsed.scheme, parsed.netloc, "/postgres", "", ""))


def _target_db_name() -> str:
    return urlsplit(_target_sync_url()).path.lstrip("/")


@pytest.fixture(scope="session")
def postgres_available() -> bool:
    """Create the test database if it doesn't exist yet and report whether
    Postgres is reachable at all, so DB-backed tests can skip cleanly
    (rather than error) when nothing is running locally.
    """
    try:
        conn = psycopg2.connect(_admin_sync_url(), connect_timeout=2)
    except psycopg2.OperationalError:
        return False

    try:
        conn.autocommit = True
        db_name = _target_db_name()
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
            if cur.fetchone() is None:
                cur.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        conn.close()

    return True


@pytest.fixture(scope="session", autouse=True)
def _migrated_test_database(postgres_available: bool) -> None:
    if postgres_available:
        run_pending_migrations()


@pytest.fixture
def _skip_without_postgres(postgres_available: bool) -> None:
    if not postgres_available:
        pytest.skip("Postgres is not reachable; skipping DB-backed regression tests.")


@pytest_asyncio.fixture
async def _reset_student_state(_skip_without_postgres: None) -> None:
    """Wipe per-student data before each DB-backed test, without touching
    the seeded `sections` rows or any Topic/Question fixture data other
    tests may have created (those are reused across tests via get-or-create,
    matching how the seed script itself upserts by unique code/prompt).
    """
    async with SessionLocal() as session:
        await session.execute(
            text(
                "TRUNCATE TABLE attempts, practice_session_questions, "
                "practice_sessions, study_plans, practice_context, users "
                "RESTART IDENTITY CASCADE"
            )
        )
        await session.commit()
