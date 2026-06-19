# Cloudflare DNS — Atriveo Bio platform

All services live under **atriveo.com** (you control this zone).

| Service  | Domain               |
| -------- | -------------------- |
| Frontend | `bio.atriveo.com`    |
| API      | `api.atriveo.com`    |
| Docs     | `docs.atriveo.com`   |
| Status   | `status.atriveo.com` |

---

## Frontend (`bio.atriveo.com`)

| Type  | Name | Target                    | Proxy   |
| ----- | ---- | ------------------------- | ------- |
| CNAME | `bio` | `<worker or pages host>` | Proxied |

Attach `bio.atriveo.com` as a custom domain on the TanStack Start worker or Pages project.

---

## API (`api.atriveo.com`) — Fly.io

After `fly certs add api.atriveo.com --app cortex-bio-api`:

| Type  | Name  | Content                 | Proxy   |
| ----- | ----- | ----------------------- | ------- |
| A     | `api` | `66.241.124.219`        | DNS only (gray cloud) |
| AAAA  | `api` | `2a09:8280:1::12f:22f7:0` | DNS only |

> Use **DNS only** (not proxied) for Fly custom domains unless you use Fly's SSL + Cloudflare orange-cloud setup intentionally.

Verify:

```bash
dig api.atriveo.com +short
curl https://api.atriveo.com/health
fly certs check api.atriveo.com --app cortex-bio-api
```

---

## Docs (`docs.atriveo.com`)

Deploy worker: `cd infra/cloudflare/docs-proxy && npx wrangler deploy --domain docs.atriveo.com`

Or attach custom domain in Workers → **cortex-bio-docs** → Triggers.

---

## Status (`status.atriveo.com`)

Deploy worker: `cd infra/cloudflare/status-proxy && npx wrangler deploy --domain status.atriveo.com`

---

## Verify

```bash
curl -sI https://bio.atriveo.com | head -3
curl -s https://api.atriveo.com/health
curl -sI https://docs.atriveo.com/docs | head -3
curl -sI https://status.atriveo.com | head -3
```
