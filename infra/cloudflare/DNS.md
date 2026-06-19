# Cloudflare DNS — Atriveo Bio platform

## URGENT: bio.atriveo.com shows NXDOMAIN?

Add this record in the **atriveo.com** DNS zone:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `bio` | `atriveo-bio.pages.dev` | Proxied |

Then attach `bio.atriveo.com` as a custom domain in Cloudflare Pages.

Full walkthrough: **`frontend/LAUNCH_CLOUDFLARE.md`**

---

Apply these records in the **atriveo.com** zone (Cloudflare DNS).

## Production app (Cloudflare Pages)

After creating the Pages project `atriveo-bio` and adding custom domains in the dashboard:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `bio` | `<project>.pages.dev` | Proxied |
| CNAME | `preview.bio` | `<project>.pages.dev` | Proxied |

Pages → Custom domains → add `bio.atriveo.com` (production) and `preview.bio.atriveo.com` (preview).

## API (api.cortex.bio)

Point to your API host (Fly, Railway, etc.):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `api.cortex` | `<your-api-host>` | Proxied (optional) |

Or if API is on a subdomain of atriveo.com, adjust accordingly.

## Developer docs (docs.cortex.bio)

Deploy the docs proxy worker:

```bash
cd cortex-bio/infra/cloudflare/docs-proxy
npm install
npx wrangler deploy
```

Then add custom domain in Workers → Triggers:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `docs.cortex` | `cortex-bio-docs.<account>.workers.dev` | Proxied |

Or attach `docs.cortex.bio` directly as a Worker custom domain in the dashboard.

### What docs.cortex.bio serves

| Path | Proxies to |
|------|------------|
| `/` | Redirect → `/docs` |
| `/docs` | `api.cortex.bio/docs` (Swagger UI) |
| `/openapi.json` | `api.cortex.bio/openapi.json` |
| `/playground` | `api.cortex.bio/playground` |

## Status page (status.cortex.bio)

Deploy the status worker:

```bash
cd cortex-bio/infra/cloudflare/status-proxy
npm install
npx wrangler deploy
```

Then attach custom domain in Workers → Triggers:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `status` | `cortex-bio-status.<account>.workers.dev` | Proxied |

Or add `status.cortex.bio` directly as a Worker custom domain in the dashboard.

## SSL

Cloudflare Universal SSL covers `*.atriveo.com` and custom hostnames once validated.

## Verify

```bash
curl -sI https://bio.atriveo.com | head -5
curl -sI https://docs.cortex.bio/docs | head -5
curl -s https://api.cortex.bio/health
curl -sI https://status.cortex.bio | head -5
```
