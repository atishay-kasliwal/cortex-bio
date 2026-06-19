# Atriveo Bio — Production Transformation

The existing UI stays. Every page becomes data-driven against a real backend built inside this project, with a `VITE_API_URL` indirection so swapping to `api.cortex.bio` later is a one-line change.

## Phase 1 — Foundations (no UI change)

1. **Enable Lovable Cloud** (Postgres + Auth).
2. **Migrations**: `profiles`, `user_roles` (+ `has_role` security-definer), `api_keys` (hashed), `api_usage`, `provider_connections`, `readiness_snapshots`, `forecast_snapshots`, `windows_today`, `insights`, `notification_prefs`. RLS scoped to `auth.uid()` + GRANTs.
3. **Seed function**: on first sign-in, generate deterministic, user-seeded biometric data (readiness components, 24h forecast, windows, insights, 90-day history) so dashboards have real, consistent data immediately. No mock state in code.
4. **API client** (`src/lib/api/client.ts`): fetch wrapper using `VITE_API_URL` (defaults to same-origin), attaches Supabase JWT, handles 401 refresh, typed errors.
5. **TanStack Query** wiring: `QueryClient` in router context, `defaultPreloadStaleTime: 0`, per-request client in `getRouter`.

## Phase 2 — Auth

- Routes: `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify` (keep `/login` & `/signup` as redirects so existing landing CTAs still work).
- Supabase email/password + Google via Lovable broker.
- Email verification + password reset flows.
- `_authenticated/route.tsx` (integration-managed) gates `/dashboard/*`, `/profile`, `/billing`, `/usage`.
- `attachSupabaseAuth` registered in `src/start.ts`.
- Root `onAuthStateChange` for cache invalidation; sign-out hygiene in nav.
- React Hook Form + Zod on every form.

## Phase 3 — Backend endpoints (TanStack server fns + server routes)

Implemented as `createServerFn` (app-internal) and mirrored under `src/routes/api/v1/*` for the public API surface (Bearer = `ak_live_*` key, verified against `api_keys.hash`).

- `GET /v1/readiness/today`, `GET /v1/readiness/history?days=90`
- `GET /v1/forecast?date=` (24h curve + windows + confidence)
- `GET /v1/windows/today`, `GET /v1/windows/week`
- `GET /v1/insights?tag=`, `GET /v1/correlations`
- `GET /v1/chronotype`
- `POST /api/keys`, `DELETE /api/keys/:id`, `GET /api/keys`, `GET /api/keys/usage`
- `GET /openapi.json` (spec generated from one source of truth)
- `POST /api/providers/:id/connect`, `POST /api/providers/:id/disconnect`
- `GET/PATCH /api/profile`, `GET/PATCH /api/notifications`

Every public API call logs to `api_usage` (key, endpoint, status, latency) for the Usage page.

## Phase 4 — Wire existing pages to live data

For each: TanStack Query (`ensureQueryData` in loader + `useSuspenseQuery` in component), skeleton (`pendingComponent`), error boundary with retry (`router.invalidate()`), empty states.

- **Landing**: CTAs → `/auth/signup`, `/auth/login`, `/docs`, `/dashboard/api-keys`. New footer links.
- **Overview**: readiness/today + forecast + windows + chronotype + 7-day history.
- **Readiness**: today + 90-day history chart + components + contributors.
- **Forecast**: 24h curve + windows + confidence band.
- **Windows**: today + week calendar visualization.
- **Insights**: list + tag filter + history pagination.
- **API Keys**: create (one-time reveal), revoke, copy, usage stats per key.
- **Settings**: profile (RHF+Zod), providers connect/disconnect, notification prefs, password change, active sessions (Supabase), delete account.

## Phase 5 — New pages

- `/faq`, `/changelog`, `/contact`, `/privacy`, `/terms`, `/status`, `/support` — public marketing/legal, app-owner editable text per Lovable trust-page guidance.
- `/profile` — account summary (avatar, plan, joined).
- `/billing` — Pro/Team placeholder + Stripe-ready scaffold (no payments wired yet).
- `/usage` — requests over time, endpoint breakdown, top keys, recent calls. Live data from `api_usage`.
- `/docs` — developer portal: Quick Start, Auth, SDK examples (JS + curl), Endpoint Explorer auto-built from `/openapi.json`, Rate Limits, Error Codes.

## Phase 6 — Production polish

- Global error boundary; per-route `errorComponent` + `notFoundComponent`.
- 404 page.
- Sitemap (`/sitemap.xml`) + `robots.txt` covering all public routes.
- `head()` per route (unique title + description + og).
- Feature-flag scaffold (`useFeatureFlag('teams')`) for org/team switcher in sidebar header — hidden by default.
- A11y: focus states, aria-labels on icon buttons, skip-to-content.
- Responsive sweep at 375 / 768 / 1280.

---

## Suggested delivery order (each step is a turn)

1. Cloud + schema + Auth pages + route guards + landing CTA rewire.
2. API client + server fns + Overview / Readiness / Forecast / Windows / Insights wired to live data.
3. API Keys (real issuance + hashed storage) + `/usage` page + `/v1/*` public routes + `/openapi.json`.
4. Settings wired (profile, providers, notifications, password, delete) + `/profile`, `/billing`.
5. Developer portal (`/docs` rebuild on OpenAPI) + new marketing/legal pages (`/faq`, `/changelog`, `/contact`, `/privacy`, `/terms`, `/status`, `/support`) + sitemap/robots + feature-flag scaffold.

Reply **"go"** to start with Step 1, or tell me to reorder/cut anything.

## Technical notes

- API keys stored as SHA-256 hash + `prefix` (first 10 chars) — full key shown once on creation.
- Biometric seed function is deterministic per `user_id` so refreshing gives consistent data; UI feels real and replaces all current hardcoded arrays.
- `VITE_API_URL` defaults to `""` (same-origin). Setting it to `https://api.cortex.bio` later swaps the entire app to that backend with no other changes — the API contract is identical.
- The public `/v1/*` routes live under `src/routes/api/v1/*` and authenticate via `Authorization: Bearer ak_live_*`; the in-app dashboards call the same logic via `createServerFn` using the user's Supabase JWT (no key required from the UI).
- No competing data sources: every existing `src/lib/mock-data.ts` import is removed and the file is deleted in Step 2.
