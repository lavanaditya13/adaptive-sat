# Backend contract — OAuth, email verification, connected-providers settings

This document describes what the frontend now assumes for epic **SCRUM-11** (Email
Verification + OAuth) and the connected-providers Settings work built alongside
it. The frontend has already been built against this contract; it currently
runs against a **mock fallback** for the JSON-returning endpoints (dashboard/
practice-style try/catch on network or 5xx errors — see
`frontend/apps/web/src/utils/api-errors.ts`'s `shouldUseMockFallback`) and will
**404 for the OAuth redirect endpoints** until they exist, since a real OAuth
handshake can't be mocked. Nothing here needs frontend changes once implemented
as specified — mismatches should be fixed on the backend side or renegotiated
here first.

All paths are relative to the API root (`/api/v1`).

## 1. User model fields (ties to SCRUM-18)

`GET /auth/me`, `POST /auth/login`, and `POST /auth/signup` must all include
these fields on the returned user object (frontend type:
`frontend/apps/web/src/types/api.ts` → `User`):

```ts
interface User {
  user_id: number;
  email: string;
  full_name: string;
  role: 'student' | 'parent' | 'tutor';
  email_verified: boolean;
  oauth_provider: 'google' | 'apple' | null;
}
```

## 2. OAuth redirect contract (ties to SCRUM-22, SCRUM-23, and the new "Connected-providers API" story)

### Start endpoints

- `GET /auth/google?intent={login|signup|link}`
- `GET /auth/apple?intent={login|signup|link}`

The frontend builds these via `getOAuthStartUrl()` in
`frontend/apps/web/src/services/auth-service.ts` and does a full-page redirect
(`window.location.href = url`) — it does not know or care about the provider's
own OAuth parameters, only that hitting this URL kicks off the flow.

- `intent=login` / `intent=signup` — used from the Login/Signup pages
  (`OAuthButtons` in `LoginForm`/`SignupForm`). Behaves per SCRUM-22/23's
  existing ACs (create-or-link by email).
- `intent=link` — **new**, used from the authenticated "Add a sign-in method"
  page (`LinkAccountsPage`, reached from `SettingsPage`). Must operate on the
  *currently authenticated* user (via the existing session cookie) rather than
  creating a new account, and must reject linking a provider identity that's
  already linked to a **different** user.

### Redirect target after the provider flow completes

**Proposal — not yet confirmed against SCRUM-22/23's original ACs, which don't
specify this:** redirect the browser back to:

- Success: `{FRONTEND_URL}/oauth/callback`
- Failure: `{FRONTEND_URL}/oauth/callback?status=error&reason=<code>`

Frontend behavior (`OAuthCallbackPage`,
`frontend/apps/web/src/pages/OAuthCallbackPage/OAuthCallbackPage.tsx`):
- No `status=error` param → calls `GET /auth/me` to positively confirm the
  session cookie was set, then redirects to `/dashboard`. If `/auth/me` fails,
  it shows a generic error.
- `status=error` → shows an error state immediately, using `reason` to pick a
  message. Enumerated reasons the frontend currently handles:
  - `access_denied` — user cancelled the provider consent screen.
  - `email_conflict` — the OAuth account's email collides in a way that
    couldn't be auto-resolved (only relevant if the backend needs to
    distinguish this from silent auto-linking — see SCRUM-22's existing AC
    that same-email accounts auto-link; this reason is for cases that don't
    qualify for auto-link, if any exist).
  - `provider_error` — generic catch-all for a provider-side failure.
  - Any other/unknown `reason` value falls back to a generic message, so new
    reason codes are safe to add without a frontend change, but please keep us
    posted so we can add a specific message.

`{FRONTEND_URL}` is same-origin with the API in every deployed environment
(see root `vercel.json` — one Vercel project serves both halves), so this is
just a relative redirect in practice, not a cross-origin one.

## 3. Email verification (ties to SCRUM-20)

- `POST /auth/verify-email` — body `{ "token": string }`. Frontend call:
  `verifyEmail(token)` in `auth-service.ts`. **Expected response shape:**
  `{ "user": User }` (matching the `signup`/`login` response envelope) so the
  frontend can update its auth store immediately with the now-`email_verified:
  true` user, without a second round trip.
- `POST /auth/resend-verification` — cookie-authenticated, no body. Frontend
  call: `resendVerificationEmail()`. Per SCRUM-20's AC, this should be a no-op
  (not an error) if the account is already verified.
- Verification link sent by email should point to:
  `{FRONTEND_URL}/verify-email?token={token}` — this is the page
  `VerifyEmailPage` reads `?token=` from.
- Error cases (all surfaced via the existing `ApiErrorResponse { detail }`
  shape and shown as-is in the UI, so please keep `detail` human-readable):
  invalid token, expired token, already-verified (if you want this to be a
  distinct non-error case rather than an error, returning 200 with the
  already-verified user is also fine and arguably simpler — frontend handles
  either).

## 4. New: Connected-providers Settings API

Not covered by any of the original 5 backend stories — this is net-new,
needed for the Settings/Link-Accounts screens built alongside SCRUM-24/21/25.
Recommend tracking as its own story under SCRUM-11 (see "Connected-providers
API — list/link/unlink OAuth providers (backend)" — written up for Jira but
not yet created due to a Jira MCP outage; text is available on request).

- `GET /settings/connected-providers` — cookie-authenticated. Response:

  ```ts
  interface ConnectedProvidersResponse {
    providers: Array<{
      provider: 'google' | 'apple';
      linked_at: string; // ISO 8601
      email: string | null; // the email associated with that provider identity, if available
    }>;
    has_password: boolean; // drives the frontend's "can't unlink your only method" guard
  }
  ```

  Frontend call: `getConnectedProviders()` in
  `frontend/apps/web/src/services/settings-service.ts`.

- `GET /settings/connected-providers/{provider}/start?intent=link` — see §2,
  this is the same endpoint family as the login/signup OAuth start, just
  namespaced under `/settings/` in the frontend's constants
  (`API.SETTINGS.LINK_PROVIDER`); feel free to make this literally the same
  route as `/auth/{provider}?intent=link` on your side if that's simpler — the
  frontend doesn't care which path serves it as long as
  `getOAuthStartUrl(provider, 'link')`'s target works. Flag if you'd prefer we
  point at `/auth/...` instead and we'll adjust the constant.

- `DELETE /settings/connected-providers/{provider}` — cookie-authenticated.
  Frontend call: `unlinkProvider(provider)`. **Must reject** (400/409, with a
  `detail` message the frontend will surface directly) when this is the user's
  only authentication method — i.e. `has_password === false` and it's their
  last remaining connected provider. The frontend also disables the button
  client-side in this case (`ConnectedProvidersList`), but the backend should
  not rely on that — treat it as a real invariant.

## Open questions for the backend dev

1. Does the OAuth success/failure redirect scheme in §2 work for you, or do
   you have a different mechanism already planned (e.g. redirecting straight
   to `/dashboard` and letting the frontend's existing session-check handle
   it)? If you redirect straight to `/dashboard`, the `OAuthCallbackPage`
   route and the "OAuth Loading" interstitial simply won't be hit in practice
   — that's fine, just confirm so we know whether to keep it wired in as a
   defensive fallback or treat it as dead code.
2. Should `/settings/connected-providers/{provider}/start` be its own route or
   an alias of `/auth/{provider}?intent=link`? Either is fine frontend-side.
3. Confirm the `POST /auth/verify-email` response includes the full updated
   `user` object (§3) — this saves the frontend an extra `/auth/me` call.
