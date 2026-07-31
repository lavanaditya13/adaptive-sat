# shadcn/ui monorepo template

This is a Vite monorepo template with shadcn/ui.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```

## API configuration

The web app reads its backend origin from `VITE_API_BASE_URL`.

```bash
cp apps/web/.env.example apps/web/.env
```

If the variable is not set:
- In a deployed build, the app uses `https://adaptive-sat-backend.vercel.app`.
- In local dev (`vite dev`), the app first tries `http://localhost:8000` (with a ~1s timeout) and falls back to the deployed backend if nothing answers there — so running the frontend locally against a locally-running backend (e.g. via `../../scripts/dev.sh all`) just works without any extra config.
