# CLAUDE.md

Guidance for Claude Code in this repository.

## Project overview

Adaptive SAT: students practice questions, the backend scores mistakes and derives weak topics, and a study plan / dashboard is generated from that data.

- `backend/` — FastAPI + SQLAlchemy 2.0 (async) + Alembic + PostgreSQL, deployed as a serverless function at `/api/*`. Commands, request-flow architecture, and the practice domain model: `.claude/rules/backend.md`.
- `frontend/` — npm-workspaces/Turborepo monorepo: Vite + React 19 SPA (`apps/web`) + shared shadcn/ui package (`packages/ui`), deployed as the static site serving everything else. Commands and source structure: `.claude/rules/frontend.md`.

Both halves deploy together as one Vercel project (root `vercel.json`) on one domain, so the deployed frontend calls the backend via same-origin relative paths — no CORS, and every branch push gets one preview URL with a matched frontend+backend pair.

## Commands — running both together

`./scripts/dev.sh [backend|frontend|all|stop] [--seed|--no-seed]` (or `npm run dev:backend` / `dev:frontend` / `dev:all` / `dev:stop` from the repo root) starts either server alone or both together with combined logs in one terminal; `all` is the default, Ctrl+C stops both. Backend mode uses `poetry run uvicorn` if `backend/.env` exists, else falls back to the Docker-based `backend/scripts/start_backend.sh`. Either path runs `alembic upgrade head` then the idempotent question seed before the server starts — safe on every invocation. `--no-seed` skips just the seed (migrations still run).

## Hard rules

- Never rename `backend/poetry-project.toml` / `poetry-project.lock` back to `pyproject.toml` / `poetry.lock` — Vercel auto-detects Poetry projects by that name and that broke the backend deployment once already (commit `d96404c`). Use the local gitignored symlinks described in `.claude/rules/backend.md` for dev tooling instead.

## Deployment

Vercel entrypoint is `backend/index.py` (re-exports `app.main.app`). Root `vercel.json`: `@vercel/python` builds `backend/index.py` and routes `/api/*` to it; `@vercel/static-build` builds `frontend/apps/web` and serves everything else (SPA fallback to `index.html`).
