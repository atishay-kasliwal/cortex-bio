# Launch playbook

Stop building features. Start building adoption.

## This week (only four things)

| # | Task | Command / link |
|---|------|----------------|
| 1 | Create GitHub repo | `./scripts/github-setup.sh` |
| 2 | Push code publicly | `git push -u origin main` |
| 3 | Deploy API | `api.cortex.bio` — see [Deploy API](#deploy-api) |
| 4 | Publish SDKs | `npm publish` + `pip publish` |

Then talk to users. Not more features.

---

## GitHub repository

```text
github.com/atriveo/cortex-bio
```

**Description:** Open-source wearable intelligence platform for cognitive readiness, performance forecasting, and human optimization.

**Topics:**

```text
apple-health, healthkit, wearables, apple-watch, biometrics,
chronotype, productivity, deep-work, forecasting, neon,
postgres, typescript, swiftui
```

### Community files (included)

```text
.github/
├── ISSUE_TEMPLATE/bug_report.yml
├── ISSUE_TEMPLATE/feature_request.yml
├── ISSUE_TEMPLATE/config.yml
├── PULL_REQUEST_TEMPLATE.md
├── FUNDING.yml
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── CONTRIBUTING.md
```

### Create repo

**Prerequisite:** Create the [atriveo](https://github.com/organizations/plan) GitHub organization (or change `REPO` in the script to your account).

`cortex-bio/` is currently nested inside `health-auto-export-server`. For a clean public repo:

```bash
cd cortex-bio
./scripts/init-standalone-repo.sh   # git init + initial commit
./scripts/github-setup.sh            # gh repo create + topics + push
```

---

## Landing page (cortex.bio)

Not docs. A homepage.

| URL | Content |
|-----|---------|
| `cortex.bio` | Marketing landing (`website/index.html`) |
| `api.cortex.bio` | API + `/docs` + `/playground` |
| `api.cortex.bio/ops` | Adoption metrics (internal) |

```bash
cd website && vercel --prod
# Custom domain: cortex.bio
```

Local preview: `http://localhost:8000/` (API serves landing)

---

## Deploy API

1. Set production env:

```bash
DATABASE_URL=...
API_KEY_PEPPER=<strong-random-string>
PUBLIC_API_URL=https://api.cortex.bio
ADMIN_SECRET=<ops-dashboard-token>
FEATURE_FORECASTING=true
FEATURE_ML=true
FEATURE_CORTEX=true
```

2. Run migrations: `cd db && npm run db:migrate`
3. Deploy `api/` to Fly.io, Railway, or Render
4. Point `api.cortex.bio` DNS

---

## Publish SDKs

### npm

```bash
cd sdk/typescript
npm login
npm publish --access public
```

### PyPI

```bash
cd sdk/python
pip install build twine
python -m build
twine upload dist/*
```

---

## Adoption metrics

Track what matters:

| Metric | Source |
|--------|--------|
| API keys created | `GET /api/admin/metrics` |
| Active keys (7d) | same |
| Requests/day | same |
| Readiness calls | `product_signals.readiness_calls` |
| Forecast calls | `product_signals.forecast_calls` |
| SDK downloads | npm / PyPI dashboards |

```bash
curl https://api.cortex.bio/api/admin/metrics \
  -H "X-Admin-Token: $ADMIN_SECRET"
```

Dashboard: `https://api.cortex.bio/ops`

**If nobody calls `/v1/forecast`, forecasting isn't the product.** Usage data tells you what matters.

---

## First external user

Before 100 users, get **1**:

- Indie hacker building a focus tool
- WHOOP power user
- Quantified-self researcher
- Productivity researcher

Have them integrate the API. One real integration beats a month of feature work.

---

## Post-launch priority (do not build yet)

| Priority | Item |
|----------|------|
| 1 | Multi-provider wearables (Oura, WHOOP, Garmin) |
| 2 | Webhooks (`readiness.changed`, `forecast.generated`) |
| 3 | OAuth instead of manual API keys |
| 4 | Team dashboards |
| 5 | Cortex telemetry ingestion |
| 6 | Research dataset export |

### Do NOT build yet

- More ML models
- LLM / agents / RAG
- Vector databases
- Mobile redesign

---

## Provider roadmap (documented, not shipped)

```text
POST /v1/providers/apple
POST /v1/providers/oura
POST /v1/providers/whoop
POST /v1/providers/garmin
```

Cortex Bio becomes the abstraction layer across wearables.

---

## Platform API map (evolution)

**Biometrics:** `/v1/readiness`, `/v1/recovery`, `/v1/sleep`  
**Intelligence:** `/v1/windows`, `/v1/chronotype`, `/v1/forecast`  
**Performance:** `/v1/performance`, `/v1/deep-work`, `/v1/attention`

Current `/v1` API is the foundation. Extend without breaking v1.

---

## Validate the thesis

> Will developers and researchers actually use a Wearable Intelligence API?

Measure it. Ship it. Talk to users.
