---
paths:
  - "backend/**"
---

## Commands (run from `backend/`)

Local dev requires a gitignored symlink — the project file is deliberately `poetry-project.toml`, not `pyproject.toml` (see root CLAUDE.md hard rules for why):

```bash
cd backend
ln -s poetry-project.toml pyproject.toml
ln -s poetry-project.lock poetry.lock
```

```bash
poetry install                              # install deps
cp .env.example .env                        # configure DATABASE_URL / SECRET_KEY / CORS_ORIGINS
poetry run uvicorn app.main:app --reload    # dev server at http://localhost:8000 (docs at /docs)
poetry run alembic upgrade head             # apply migrations
poetry run alembic revision --autogenerate -m "message"   # create a new migration
poetry run pytest                           # run test suite
poetry run pytest app/tests/test_health.py::test_health_endpoint   # run a single test
```

Docker Compose (Postgres + API):

```bash
docker compose up --build          # full stack: API on :8000, Postgres on :5432
./scripts/start_backend.sh         # helper: db up, migrate, optionally seed, then launch API
./scripts/start_backend.sh --no-seed
python scripts/seed_sat_questions.py   # seed backend/data/sample_sat_questions_seed.jsonl into the db
```

`backend/requirements.txt` is a poetry export kept in sync for Vercel's Python build — not the source of truth. Edit `poetry-project.toml` first, then re-export: `poetry export -f requirements.txt --output requirements.txt` (from `backend/`, via the symlink setup above).

## Request flow

`app/main.py` builds the FastAPI app, wires CORS from `settings.cors_origins`, and mounts `app.api.v1.router.api_router` at `/api/v1`. Layers:

- `app/api/v1/endpoints/*.py` — thin route handlers only; depend-inject `get_db` (async session, `app/core/database.py`) and `get_current_user` (JWT auth, `app/core/security.py`), delegate everything else to a service function.
- `app/services/*.py` — all business logic and orchestration as free functions taking `db: AsyncSession` plus explicit args (not classes). This is the layer to read/edit for behavior changes.
- `app/repositories/*.py` — generic CRUD (`BaseRepository[ModelType]`) per model; services also issue `select()` queries directly when logic doesn't fit generic CRUD.
- `app/models/*.py` — SQLAlchemy ORM models (declarative base in `app/core/database.py`).
- `app/schemas/*.py` — Pydantic request/response models, one file per domain area.

Auth is JWT-based and dual-mode: `get_current_user` in `app/core/security.py` accepts either an `Authorization: Bearer` header or an `access_token` cookie — check both when touching auth-sensitive code.

`app/core/config.py` uses `pydantic-settings` with custom `field_validator`s that build `DATABASE_URL`/`SYNC_DATABASE_URL` from either a full connection string (Neon-style, with `sslmode`/`channel_binding` normalization for asyncpg vs. psycopg2) or discrete `POSTGRES_*` parts. `DATABASE_URL` is used by the app (asyncpg); `SYNC_DATABASE_URL` is used by Alembic only.

## Practice domain model

The core of the app, in `app/services/practice_service.py`: a student selects a `Section` (math / reading_writing via `SECTION_CODES`), which unlocks `PracticeSession` modes — `section`, `topic`, and `adaptive` (adaptive is gated behind 3 completed section sessions, computed on the fly, not stored as a flag). A session owns ordered `PracticeSessionQuestion` rows; answering one creates an `Attempt`, which `skill_scoring_service.py` aggregates into per-topic accuracy (`get_student_progress`) to find weakest topics. Completing a session triggers `recommendation_service.generate_study_plan_for_student`, which turns weakest topics into a prioritized `StudyPlan`. Dashboard/section/practice endpoints all read from this same attempt/topic-accuracy pipeline — when changing scoring or session logic, check all three (`practice_service`, `skill_scoring_service`, `recommendation_service`) since they share state derived from `Attempt`.
