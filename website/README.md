# Cortex Bio — Website

Marketing homepage for **cortex.bio**.

## Deploy to Vercel

```bash
cd website
vercel --prod
```

Set custom domain: `cortex.bio`

## Local preview

Served by the API at `http://localhost:8000/` when running `npm run dev` in `api/`.

Ops dashboard (adoption metrics): `http://localhost:8000/ops`

Requires `ADMIN_SECRET` in API `.env`.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Landing page — hero, API examples, CTAs |
| `ops.html` | Internal adoption metrics dashboard |
| `vercel.json` | Deploy config with API proxy rewrites |

API, docs, and playground can live on `api.cortex.bio` while marketing lives on `cortex.bio`.
