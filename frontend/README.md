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

If the variable is not set, the app falls back to `https://adaptive-sat-backend.vercel.app`.
