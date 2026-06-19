# docs.cortex.bio — Cloudflare Worker

Proxies OpenAPI documentation from `api.cortex.bio` to a dedicated docs domain.

## Routes

| Path | Proxies to |
|------|------------|
| `/` | Redirect → `/docs` |
| `/docs` | `api.cortex.bio/docs` |
| `/openapi.json` | `api.cortex.bio/openapi.json` |
| `/playground` | `api.cortex.bio/playground` |
| `/health` | `api.cortex.bio/health` |

## Deploy

```bash
cd infra/cloudflare/docs-proxy
npm install
npx wrangler login
npx wrangler deploy
```

## Custom domain

1. Cloudflare Dashboard → Workers & Pages → **cortex-bio-docs**
2. Settings → Triggers → **Add Custom Domain**
3. Enter: `docs.cortex.bio`

Or add DNS (zone `cortex.bio`):

| Type | Name | Target |
|------|------|--------|
| CNAME | `docs` | `cortex-bio-docs.<account>.workers.dev` |

## Environment

Configured in `wrangler.toml`:

```toml
[vars]
API_ORIGIN = "https://api.cortex.bio"
```

Override per environment in the Cloudflare dashboard if needed.

## Verify

```bash
curl -sI https://docs.cortex.bio/docs | head -5
curl -s https://docs.cortex.bio/openapi.json | head -c 120
```
