# Deploy Atriveo Bio to Cloudflare Pages

Production: **bio.atriveo.com**  
Preview: **preview.bio.atriveo.com**  
API: **api.cortex.bio**  
Docs: **docs.cortex.bio** → proxy to `api.cortex.bio/docs`

## Prerequisites

1. Supabase project with Email auth enabled
2. Cortex Bio API deployed with Neon PostgreSQL
3. GitHub repo containing `cortex-bio/frontend/`

## 1. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Enable Email provider + confirm email
3. Copy **Project URL** and **anon public key**
4. Optional: set JWT secret in API `SUPABASE_JWT_SECRET` (or use JWKS via `SUPABASE_URL`)

## 2. Cortex Bio API

Deploy `cortex-bio/api` to your host (Fly, Railway, etc.) at `api.cortex.bio`.

Required env:

```env
DATABASE_URL=postgresql://...
API_KEY_PEPPER=...
SUPABASE_URL=https://xxx.supabase.co
CORS_ORIGINS=https://bio.atriveo.com,https://preview.bio.atriveo.com
FEATURE_ORGANIZATIONS=false
```

Run migrations:

```bash
cd cortex-bio/db && npm run db:migrate && npm run db:generate
```

## 3. Cloudflare Pages (frontend)

### GitHub integration

1. Cloudflare Dashboard → Workers & Pages → Create → Connect to Git
2. Root directory: `cortex-bio/frontend`
3. Build command: `npm ci && npm run build`
4. Build output: `.output/public` (TanStack Start + Nitro)

### Environment variables (Production)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.cortex.bio` |
| `VITE_DOCS_API_URL` | `https://api.cortex.bio` |
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key |
| `NODE_VERSION` | `20` |

Duplicate vars for **Preview** environment; use preview Supabase if needed.

### Custom domains

| Environment | Domain |
|-------------|--------|
| Production | `bio.atriveo.com` |
| Preview | `preview.bio.atriveo.com` |

DNS (Cloudflare):

```
bio.atriveo.com      CNAME  <pages>.pages.dev
preview.bio.atriveo.com  CNAME  <pages>.pages.dev
api.cortex.bio       CNAME  <api-host>
docs.cortex.bio      CNAME  api.cortex.bio  (or Worker route to /docs)
```

## 4. SPA routing

`public/_redirects` ships `/* /index.html 200` for client-side routing.

Security headers: `public/_headers`

## 5. Local development

```bash
cd cortex-bio/frontend
cp .env.example .env
# fill Supabase + point VITE_API_URL=http://localhost:8000
npm install
npm run dev
```

```bash
cd cortex-bio/api && npm run dev
```

## 6. Verify launch

1. Sign up at bio.atriveo.com → verify email → login
2. Dashboard auto-provisions Cortex Bio user + default API key
3. Readiness / forecast / windows load from live API (empty until wearable sync)
4. API keys page shows real keys
5. `/docs` loads OpenAPI explorer from `api.cortex.bio/openapi.json`

## Architecture

```
Supabase Auth (JWT)
       ↓
bio.atriveo.com (Cloudflare Pages)
       ↓ Bearer JWT
api.cortex.bio (Cortex Bio API)
       ↓
Neon PostgreSQL (users ↔ supabase_user_id ↔ api_keys)
```

External developers use `cb_live_*` API keys — same user identity resolution as dashboard JWTs.

## CLI deploy scripts

```bash
# Frontend → Cloudflare Pages
./scripts/deploy-frontend.sh --dry-run

# Docs proxy → docs.cortex.bio
cd infra/cloudflare/docs-proxy && npm install && npx wrangler deploy
```

DNS reference: `infra/cloudflare/DNS.md`
