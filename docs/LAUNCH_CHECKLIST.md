# Launch Checklist — Atriveo Bio / Cortex Bio

Production: **bio.atriveo.com** · API: **api.cortex.bio** · Docs: **docs.cortex.bio**

---

## Pre-push (automated locally)

- [ ] `./scripts/security-audit.sh` passes
- [ ] `api/.env`, `frontend/.env`, `frontend/.env.production` are **not** tracked
- [ ] Copy templates: `cp frontend/.env.production.example frontend/.env.production` (fill in Cloudflare)
- [ ] `./scripts/init-standalone-repo.sh` (first time only)

---

## GitHub

- [ ] Create org **Atriveo** (preferred) or use `atishay-kasliwal/cortex-bio`
- [ ] `./scripts/github-setup.sh`
- [ ] Verify `.github/workflows/ci.yml` runs green on `main`
- [ ] Enable branch protection on `main` (optional)
- [ ] Add repository topics (script sets automatically)
- [ ] Confirm community files: `ISSUE_TEMPLATE`, `PR template`, `CODE_OF_CONDUCT`, `SECURITY`, `CONTRIBUTING`, `FUNDING.yml`

**Human required:** GitHub org creation, first `git push`, branch protection rules

---

## Neon (database)

- [ ] Create Neon project + database
- [ ] Set `DATABASE_URL` in API production env (never commit)
- [ ] Run migrations: `cd db && npm run db:migrate && npm run db:generate`
- [ ] Rotate credentials if previously exposed in local `.env`

**Human required:** Neon dashboard, connection string

---

## Supabase (auth)

- [ ] Create project at supabase.com
- [ ] Enable Email auth + confirm email
- [ ] Copy `SUPABASE_URL` + anon key → Cloudflare Pages env vars
- [ ] Set API `SUPABASE_URL` + optional `SUPABASE_JWKS_URL`
- [ ] Configure redirect URLs: `https://bio.atriveo.com/auth/*`

**Human required:** Supabase dashboard

---

## API deployment (api.cortex.bio)

- [ ] Deploy `api/` to Fly, Railway, or similar
- [ ] Environment variables:

```env
DATABASE_URL=
API_KEY_PEPPER=
SUPABASE_URL=
SUPABASE_JWKS_URL=
ADMIN_SECRET=
CORS_ORIGINS=https://bio.atriveo.com,https://preview.bio.atriveo.com
PUBLIC_API_URL=https://api.cortex.bio
FEATURE_ORGANIZATIONS=false
```

- [ ] `curl https://api.cortex.bio/health`
- [ ] `curl https://api.cortex.bio/openapi.json`

**Human required:** API host + env injection

---

## Cloudflare Pages (bio.atriveo.com)

- [ ] Workers & Pages → Connect GitHub → repo `cortex-bio`
- [ ] Root directory: `frontend`
- [ ] Build: `npm ci && npm run build`
- [ ] Output: `.output/public`
- [ ] Production branch: `main`
- [ ] Environment variables (Production):

| Variable | Value |
|----------|-------|
| `NODE_VERSION` | `22` |
| `VITE_API_URL` | `https://api.cortex.bio` |
| `VITE_DOCS_API_URL` | `https://api.cortex.bio` |
| `VITE_SUPABASE_URL` | from Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | from Supabase |

- [ ] Custom domain: `bio.atriveo.com`
- [ ] Preview domain: `preview.bio.atriveo.com`

See: `frontend/LAUNCH_CLOUDFLARE.md`

**Human required:** Cloudflare dashboard, DNS

---

## DNS (atriveo.com zone)

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `bio` | `<project>.pages.dev` | Proxied |
| CNAME | `preview.bio` | `<project>.pages.dev` | Proxied |

Fix **NXDOMAIN**: record `bio` must exist before `bio.atriveo.com` resolves.

See: `infra/cloudflare/DNS.md`

**Human required:** Cloudflare DNS

---

## Cloudflare Worker (docs.cortex.bio)

- [ ] `cd infra/cloudflare/docs-proxy && npm install`
- [ ] `npx wrangler login`
- [ ] `npx wrangler deploy`
- [ ] Attach custom domain `docs.cortex.bio`

See: `infra/cloudflare/docs-proxy/README.md`

**Human required:** Wrangler login, Worker custom domain

---

## Status page (status.cortex.bio)

- [ ] `cd infra/cloudflare/status-proxy && npm install`
- [ ] `npx wrangler deploy`
- [ ] Attach custom domain `status.cortex.bio`

See: `infra/cloudflare/status-proxy/README.md`

---

## Post-deploy validation

- [ ] `https://bio.atriveo.com` loads
- [ ] Sign up → verify email → login
- [ ] Dashboard auto-provisions (`POST /api/auth/provision`)
- [ ] Onboarding steps show for new user
- [ ] API keys page shows default key
- [ ] `https://docs.cortex.bio/docs` loads Swagger UI
- [ ] `https://status.cortex.bio` shows operational status
- [ ] `https://bio.atriveo.com/docs` loads developer portal
- [ ] PR creates preview deployment on Cloudflare Pages

---

## Security post-launch

- [ ] Rotate Neon password if ever committed
- [ ] Rotate `API_KEY_PEPPER` and re-issue API keys in production
- [ ] Set strong `ADMIN_SECRET` for `/ops` dashboard
- [ ] Enable GitHub secret scanning + dependabot
