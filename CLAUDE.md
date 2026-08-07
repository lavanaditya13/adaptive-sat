# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Adaptive SAT is an AI-powered SAT prep platform: students practice questions, the backend scores mistakes and derives weak topics, and a study plan / dashboard is generated from that data. Two halves live in one repo and deploy together as a single Vercel project (root `vercel.json`):

- `backend/` — FastAPI + SQLAlchemy 2.0 (async) + Alembic + PostgreSQL, deployed as a serverless function at `/api/*`.
- `frontend/` — npm-workspaces monorepo (Turborepo) containing a Vite + React 19 SPA (`apps/web`) and a shared shadcn/ui component package (`packages/ui`), deployed as the static site serving everything else.

They still build independently (no shared build step), but ship from the same Vercel project/domain, so the deployed frontend talks to the backend via same-origin relative paths (see `constants/environment.ts` below) — no CORS, and every preview deployment automatically gets a matching frontend+backend pair on one URL.

## Working agreements

- **Branching**: never commit directly on `develop`/`main`. Before writing any code:
  ```bash
  git checkout develop && git pull && git checkout -b feature/ASAT-123-short-desc
  ```
  Branch name is `feature/[JIRA-KEY]-[one/two word description]` (real Jira key, e.g. `ASAT-123`, not a placeholder). Confirm the branch with `git branch --show-current` before making any edits. This is enforced by a `PreToolUse` hook (see `.claude/settings.json`) that blocks `Edit`/`Write` unless the current branch matches `feature/*` — it also allows `worktree-*` branches, since Claude Code's own EnterWorktree isolation names branches that way and still needs to work inside a worktree before a `feature/*` branch exists there.
- **Tests**: every new/changed frontend component or page gets a colocated Vitest test file (`ComponentName.test.tsx` inside the component's own folder, React Testing Library) — see existing examples like `pages/SettingsPage/SettingsPage.test.tsx` and `components/auth/OAuthButtons/OAuthButtons.test.tsx`. New backend logic gets a matching `app/tests/test_*.py`.
- **Docs and written output** (CLAUDE.md, PR descriptions, plans): token-efficient, imperative, minimal prose — write for AI/tool consumption, not narrative explanation.
- **Decisions**: make reasonable calls upfront rather than presenting open-ended options when a default is clear. If something is genuinely ambiguous or consequential, flag it explicitly as an open question — never guess silently and move on.

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

Env config for `apps/web`: copy `frontend/apps/web/.env.example` to `.env` and set `VITE_API_BASE_URL` to override the backend origin explicitly. If unset, `src/constants/environment.ts` resolves it at runtime: in a deployed build it uses a relative base URL (`''`), since frontend and backend are served from the same Vercel project/origin; in local dev (`vite dev`) it first probes `http://localhost:8000` (~1s timeout, cached for the page load) and falls back to a relative base URL if nothing answers there.

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

`./scripts/dev.sh [backend|frontend|all|stop] [--seed|--no-seed]` (or `npm run dev:backend` / `dev:frontend` / `dev:all` / `dev:stop` from the repo root) starts either server alone or both together with combined logs streamed to one terminal; `all` is the default and Ctrl+C stops both cleanly. Backend mode uses `poetry run uvicorn` if `backend/.env` exists, otherwise falls back to the Docker-based `backend/scripts/start_backend.sh`. Either path runs `alembic upgrade head` and then the idempotent question seed (`backend/scripts/seed_sat_questions.py`) before the server starts — safe to run on every invocation, since migrations no-op once current and the seed script skips rows it already inserted. Pass `--no-seed` to skip just the question seed (migrations still run).

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

Vercel deployment entrypoint is `backend/index.py` (re-exports `app.main.app`). Build/runtime config is in the repo-root `vercel.json`: `@vercel/python` builds `backend/index.py` and routes `/api/*` to it; `@vercel/static-build` builds `frontend/apps/web` and serves everything else (SPA fallback to `index.html`). Both halves deploy together as one Vercel project (`adaptive-sat`) — every branch push gets one preview URL serving matched frontend+backend, eliminating the CORS/URL-mismatch issues a two-project split used to cause.

### Frontend structure (`frontend/apps/web/src`)

Enterprise-grade `src/` layout — top-level dirs are `components`, `pages`, `constants`, `services`, `store`, `types`, `providers`, `hooks`, `utils`, `context`, `mocks`, `test`. Don't scatter equivalent concerns outside these (e.g. no ad hoc `helpers/` or `lib/`).

- `App.tsx` / `constants/routes.ts` — route table (`react-router-dom`); central `ROUTES` constant, not scattered path strings.
- **Component authoring pattern**: every component/page lives in its own folder: `ComponentName.tsx` (logic/markup), `ComponentName.styles.ts` (Tailwind/cva variants), `ComponentName.constants.ts` (all UI copy/strings — no inline literals in the `.tsx`), `ComponentName.test.tsx` (Vitest + RTL, colocated), and a root `index.ts` barrel re-exporting the public surface. Applies under both `pages/<PageName>/` and `components/<domain>/<ComponentName>/`. Existing pre-barrel files are being migrated incrementally — don't block unrelated changes on backfilling barrels, but every new/touched component should conform.
- `services/*.ts` — one file per backend resource (`auth-service`, `dashboard-service`, `practice-service`), all built on the shared `services/api-client.ts` (axios instance, `withCredentials: true` since auth uses a cookie, base URL from `constants/environment.ts`).
- `store/*.ts` — Zustand stores, one per concern (`auth-store`, `practice-session-store`, `results-store`); no single global store.
- `types/*.ts` — shared TypeScript types/interfaces not local to one component (e.g. `types/api.ts`).
- `providers/query-provider.tsx` — TanStack Query provider wrapping the app; server state goes through React Query + the `services/` layer, not ad hoc fetches in components.
- `context/` — React context providers for cross-cutting UI state that doesn't belong in a Zustand store (create as needed; currently unused — prefer `store/` unless the state is tightly scoped to a subtree).
- `constants/api-endpoints.ts` / `query-keys.ts` — centralized endpoint paths and query-key factories; use these instead of inlining URLs or ad hoc key arrays.
- `mocks/` — mock data/handlers, exported together from `mocks/index.ts`, for local development/testing against fixture data instead of a live backend.
- `utils/validation-schemas.ts` — Zod schemas paired with `react-hook-form` via `@hookform/resolvers` for forms (`LoginForm`, `SignupForm`).
- `hooks/use-navigation-guard.ts` — guards in-progress practice sessions against accidental navigation/tab close (`beforeunload` + confirm-exit dialog); reuse this for any other flow where losing in-progress state should be confirmed.

UI primitives (button, card, dialog, input, etc.) live in the separate `packages/ui` workspace and are imported as `@workspace/ui/components/*`; app-specific composite components live in `apps/web/src/components`. Path alias `@/` maps to `apps/web/src/`.
