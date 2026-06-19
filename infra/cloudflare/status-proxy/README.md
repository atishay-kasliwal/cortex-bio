# status.cortex.bio — Cloudflare Worker

Public status page for Cortex Bio. Probes API, app, and docs endpoints and renders a simple HTML board.

## Deploy

```bash
cd infra/cloudflare/status-proxy
npm install
npx wrangler deploy
```

## Custom domain

1. Cloudflare Dashboard → Workers & Pages → **cortex-bio-status**
2. Settings → Triggers → **Add Custom Domain** → `status.cortex.bio`

Or add DNS in the **cortex.bio** zone:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `status` | `cortex-bio-status.<account>.workers.dev` | Proxied |

## Endpoints

| Path | Description |
|------|-------------|
| `/` | HTML status page |
| `/health` | Worker liveness (`ok`) |
