# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Adaptive SAT is an AI-powered SAT prep platform: students practice questions, the backend scores mistakes and derives weak topics, and a study plan / dashboard is generated from that data. Two independently deployed halves live in one repo:

- `backend/` — FastAPI + SQLAlchemy 2.0 (async) + Alembic + PostgreSQL, deployed to Vercel as a serverless function.
- `frontend/` — npm-workspaces monorepo (Turborepo) containing a Vite + React 19 SPA (`apps/web`) and a shared shadcn/ui component package (`packages/ui`), deployed separately (the web app talks to the backend over `VITE_API_BASE_URL`).

There is no shared build between the two; treat them as separate projects that happen to live in one git repo.

## Commands

### Frontend (run from `frontend/`, or via root `package.json` which prefixes into `frontend/`)

```bash
npm run dev         # turbo dev  — starts apps/web on Vite (default http://localhost:5173)
npm run build        # turbo build
npm run lint          # turbo lint (eslint)
npm run typecheck     # turbo typecheck (tsc --noEmit)
npm run format        # turbo format (prettier, with prettier-plugin-tailwindcss)
```

These fan out through Turborepo to every workspace (`apps/web`, `packages/ui`). To target just `apps/web`, `cd frontend/apps/web` and run the same script names directly (e.g. `npm run dev`, `npm run build` which runs `tsc -b && vite build`).

Add a new shadcn/ui component (places files in `packages/ui/src/components`, run from `frontend/`):

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

Env config for `apps/web`: copy `frontend/apps/web/.env.example` to `.env` and set `VITE_API_BASE_URL` to override the backend origin explicitly. If unset, `src/constants/environment.ts` resolves it at runtime: in a deployed build it uses the deployed Vercel backend directly; in local dev (`vite dev`) it first probes `http://localhost:8000` (~1s timeout, cached for the page load) and falls back to the deployed backend if nothing answers — so local frontend + local backend just works with no extra config.

### Backend (run from `backend/`)

The actual project file is `backend/poetry-project.toml` (lock: `poetry-project.lock`) — deliberately **not** named `pyproject.toml`, so Vercel's build doesn't auto-detect a Poetry project for `adaptive-sat-backend` and instead uses `requirements.txt` (see commit `d96404c`, "Use requirements file for Vercel backend"). **Never rename these back** — that broke the Vercel backend deployment once already. Since Poetry and the local Dockerfile both hard-require the literal name `pyproject.toml`/`poetry.lock`, this repo instead expects a **local, gitignored symlink** for dev tooling:

```bash
cd backend
ln -s poetry-project.toml pyproject.toml
ln -s poetry-project.lock poetry.lock
```

(`backend/.gitignore` already excludes `/pyproject.toml` and `/poetry.lock` so these symlinks can never be committed.) With that in place:

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

Note: `requirements.txt` at `backend/requirements.txt` is a poetry export kept in sync for Vercel's Python build — it is not the source of truth for dependencies. Edit `poetry-project.toml` first, then re-export (`poetry export -f requirements.txt --output requirements.txt` from within `backend/`, via the symlink setup above).

### Running both together

`./scripts/dev.sh [backend|frontend|all|stop]` (or `npm run dev:backend` / `dev:frontend` / `dev:all` / `dev:stop` from the repo root) starts either server alone or both together with combined logs streamed to one terminal; `all` is the default and Ctrl+C stops both cleanly. Backend mode uses `poetry run uvicorn` if `backend/.env` exists, otherwise falls back to the Docker-based `backend/scripts/start_backend.sh`.

## Architecture

### Backend request flow

`app/main.py` builds the FastAPI app, wires CORS from `settings.cors_origins`, and mounts `app.api.v1.router.api_router` at `/api/v1`. Routing is layered:

- `app/api/v1/endpoints/*.py` — thin route handlers only; they depend-inject `get_db` (async session, `app/core/database.py`) and `get_current_user` (JWT auth, `app/core/security.py`), and delegate everything else to a service function.
- `app/services/*.py` — all business logic and orchestration lives here as free functions taking `db: AsyncSession` plus explicit args (not classes). This is the layer to read/edit for behavior changes.
- `app/repositories/*.py` — generic CRUD (`BaseRepository[ModelType]`) per model; used for straightforward persistence, though services also issue `select()` queries directly when logic doesn't fit generic CRUD.
- `app/models/*.py` — SQLAlchemy ORM models (declarative base in `app/core/database.py`).
- `app/schemas/*.py` — Pydantic request/response models, one file per domain area, imported by both endpoints and services.

Auth is JWT-based and dual-mode: `get_current_user` in `app/core/security.py` accepts either an `Authorization: Bearer` header or an `access_token` cookie — check both when touching auth-sensitive code.

Config (`app/core/config.py`) uses `pydantic-settings` with custom `field_validator`s that build `DATABASE_URL`/`SYNC_DATABASE_URL` from either a full connection string (Neon-style, with `sslmode`/`channel_binding` normalization for asyncpg vs. psycopg2) or discrete `POSTGRES_*` parts. `DATABASE_URL` is used by the app (asyncpg); `SYNC_DATABASE_URL` is used by Alembic only.

**Practice domain model** (the core of the app, in `app/services/practice_service.py`): a student selects a `Section` (math / reading_writing via `SECTION_CODES`), which unlocks `PracticeSession` modes — `section`, `topic`, and `adaptive` (adaptive is gated behind 3 completed section sessions, computed on the fly, not stored as a flag). A session owns ordered `PracticeSessionQuestion` rows; answering one creates an `Attempt`, which `skill_scoring_service.py` aggregates into per-topic accuracy (`get_student_progress`) to find weakest topics. Completing a session triggers `recommendation_service.generate_study_plan_for_student`, which turns weakest topics into a prioritized `StudyPlan`. Dashboard/section/practice endpoints all read from this same attempt/topic-accuracy pipeline — when changing scoring or session logic, check all three (`practice_service`, `skill_scoring_service`, `recommendation_service`) since they share state derived from `Attempt`.

Vercel deployment entrypoint is `backend/index.py` (re-exports `app.main.app`); there is no `vercel.json` in the repo, so build/runtime config is set in the Vercel project dashboard, not in-repo.

### Frontend structure (`frontend/apps/web/src`)

- `App.tsx` / `constants/routes.ts` — route table (`react-router-dom`); central `ROUTES` constant, not scattered path strings.
- `pages/<PageName>/` — one directory per route, each with `.tsx` + `.constants.ts` + (usually) `.styles.ts`. `components/<domain>/<ComponentName>/` follows the same three-file convention (component, constants, styles) — mirror it for new components.
- `services/*.ts` — one file per backend resource (`auth-service`, `dashboard-service`, `practice-service`), all built on the shared `services/api-client.ts` (axios instance, `withCredentials: true` since auth uses a cookie, base URL from `constants/environment.ts`).
- `store/*.ts` — Zustand stores, one per concern (`auth-store`, `practice-session-store`, `results-store`); no single global store.
- `providers/query-provider.tsx` — TanStack Query provider wrapping the app; server state goes through React Query + the `services/` layer, not ad hoc fetches in components.
- `constants/api-endpoints.ts` / `query-keys.ts` — centralized endpoint paths and query-key factories; use these instead of inlining URLs or ad hoc key arrays.
- `mocks/` — mock data/handlers, exported together from `mocks/index.ts`, for local development/testing against fixture data instead of a live backend.
- `utils/validation-schemas.ts` — Zod schemas paired with `react-hook-form` via `@hookform/resolvers` for forms (`LoginForm`, `SignupForm`).
- `hooks/use-navigation-guard.ts` — guards in-progress practice sessions against accidental navigation/tab close (`beforeunload` + confirm-exit dialog); reuse this for any other flow where losing in-progress state should be confirmed.

UI primitives (button, card, dialog, input, etc.) live in the separate `packages/ui` workspace and are imported as `@workspace/ui/components/*`; app-specific composite components live in `apps/web/src/components`. Path alias `@/` maps to `apps/web/src/`.
