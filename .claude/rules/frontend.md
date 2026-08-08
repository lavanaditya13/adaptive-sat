---
paths:
  - "frontend/**"
---

## Commands (run from `frontend/`, or via root `package.json` which prefixes into `frontend/`)

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

## Structure (`frontend/apps/web/src`)

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
