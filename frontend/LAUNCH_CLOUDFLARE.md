# Launch Atriveo Bio on Cloudflare Pages

**Production:** bio.atriveo.com  
**Preview:** preview.bio.atriveo.com

---

## Fix `DNS_PROBE_FINISHED_NXDOMAIN` (bio.atriveo.com)

This error means **no DNS record exists** for `bio.atriveo.com`. The app cannot resolve until you add it.

### Step 1 — Create Cloudflare Pages project

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. **Connect to Git** → select your repository
3. **Root directory:** `cortex-bio/frontend`
4. **Build command:** `npm ci && npm run build`
5. **Build output:** `.output/public`
6. **Environment variables** (Production):

| Variable                        | Value                     |
| ------------------------------- | ------------------------- |
| `NODE_VERSION`                  | `22`                      |
| `VITE_API_URL`                  | `https://api.cortex.bio`  |
| `VITE_DOCS_API_URL`             | `https://api.cortex.bio`  |
| `VITE_SUPABASE_URL`             | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key         |

5. Deploy once — note your Pages URL: `atriveo-bio.pages.dev` (or similar)

### Step 2 — Add DNS record (atriveo.com zone)

Cloudflare → **DNS** → **Records** → **Add record**

| Type      | Name  | Target                  | Proxy                  |
| --------- | ----- | ----------------------- | ---------------------- |
| **CNAME** | `bio` | `atriveo-bio.pages.dev` | Proxied (orange cloud) |

For preview subdomain:

| Type      | Name          | Target                  | Proxy   |
| --------- | ------------- | ----------------------- | ------- |
| **CNAME** | `preview.bio` | `atriveo-bio.pages.dev` | Proxied |

> **Name** is `bio`, not `bio.atriveo.com` — Cloudflare appends the zone automatically.

### Step 3 — Attach custom domain in Pages

Pages project → **Custom domains** → **Set up a domain**:

- `bio.atriveo.com` → Production
- `preview.bio.atriveo.com` → Preview

Wait 1–5 minutes for DNS propagation, then reload `https://bio.atriveo.com`.

---

## Automatic deployments

| Event          | Result                                                   |
| -------------- | -------------------------------------------------------- |
| Push to `main` | Production deploy → bio.atriveo.com                      |
| Open PR        | Preview deploy → `*.pages.dev` + preview.bio.atriveo.com |

Enable in Pages → **Settings** → **Builds & deployments** → Production branch: `main`.

---

## Config files (in repo)

```
cortex-bio/frontend/
├── wrangler.toml              # Pages project name + output dir
├── cloudflare-pages.config.ts # Build reference (dashboard setup)
├── public/_redirects          # SPA routing
├── public/_headers            # Security headers
├── .env.production            # Production Vite vars (template)
└── .env.local                 # Local dev vars
```

---

## Verify launch

```bash
# DNS resolves
dig bio.atriveo.com +short

# App loads
curl -sI https://bio.atriveo.com | head -3

# API healthy
curl -s https://api.cortex.bio/health
```

### User flow test

1. Visit https://bio.atriveo.com
2. Sign up → verify email → sign in
3. Dashboard shows onboarding steps (new user) or live data (existing)
4. API keys auto-created on first login
5. `/docs` loads OpenAPI from api.cortex.bio

---

## Related

- API DNS: `infra/cloudflare/DNS.md`
- Docs proxy: `infra/cloudflare/docs-proxy/`
- Full deployment: `DEPLOYMENT.md`
