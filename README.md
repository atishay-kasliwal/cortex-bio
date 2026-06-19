# Cortex Bio

**Open-source wearable intelligence infrastructure.**

Transform Apple Health, Apple Watch, WHOOP, Oura, Garmin, and Fitbit data into **cognitive readiness**, **performance forecasts**, **chronotype insights**, and **deep-work windows**.

API-first · Research-backed · Self-hostable

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![API](https://img.shields.io/badge/API-v1-blue)](https://api.cortex.bio/docs)
[![npm](https://img.shields.io/badge/npm-%40cortexbio%2Fsdk-CB3837)](sdk/typescript/)

[Playground](https://playground.cortex.bio) · [API Docs](/docs) · [OpenAPI](/openapi.json) · [Launch checklist](docs/LAUNCH_CHECKLIST.md) · [GitHub](https://github.com/atriveo/cortex-bio)

---

## Get cognitive readiness in one request

Most health APIs return raw metrics — sleep, HRV, heart rate. **Cortex Bio returns derived intelligence.**

```bash
curl https://api.cortex.bio/v1/readiness/today \
  -H "Authorization: Bearer cb_live_xxx"
```

```json
{
  "api_version": "v1",
  "date": "2026-06-19",
  "readiness_score": 84,
  "contributors": [
    { "factor": "Strong sleep", "impact": "+12", "direction": "positive" },
    { "factor": "HRV above baseline", "impact": "+8", "direction": "positive" }
  ],
  "engine_version": "rules-v1"
}
```

### Forecast your peak work window

```bash
curl https://api.cortex.bio/v1/forecast \
  -H "Authorization: Bearer cb_live_xxx"
```

```json
{
  "api_version": "v1",
  "date": "2026-06-19",
  "best_deep_work_window": { "start": "09:15", "end": "11:45" },
  "recovery_window": { "start": "13:00", "end": "14:15" },
  "hourly_forecast": [
    { "hour": 9, "score": 91 },
    { "hour": 10, "score": 89 }
  ]
}
```

---

## What you get

| Intelligence | Endpoint | Description |
|--------------|----------|-------------|
| **Readiness** | `GET /v1/readiness/today` | Explainable cognitive readiness score |
| **Chronotype** | `GET /v1/chronotype` | Morning lark → night owl classification |
| **Windows** | `GET /v1/windows/today` | Peak, crash, and recovery windows |
| **Forecast** | `GET /v1/forecast` | 24-hour performance curve |
| **Predictions** | `GET /v1/predictions/tomorrow` | ML work-performance forecast |
| **Baselines** | `GET /v1/baselines` | Personal 30-day biomarker norms |

Full reference: **[OpenAPI docs](/docs)** · [`openapi.json`](/openapi.json)

---

## SDKs

### TypeScript

```bash
npm install @cortexbio/sdk
```

```typescript
import { CortexBio } from '@cortexbio/sdk';

const client = new CortexBio({
  apiKey: process.env.CORTEX_BIO_API_KEY!,
});

const readiness = await client.readiness.today();
const forecast = await client.forecast.today();
const chronotype = await client.chronotype.get();
```

### Python

```bash
pip install cortexbio
```

```python
from cortexbio import CortexBio

with CortexBio(api_key="cb_live_xxx") as client:
    readiness = client.readiness.today()
    forecast = client.forecast.today()
```

---

## API Playground

Test every endpoint in the browser — no code required.

**Local:** [http://localhost:8000/playground](http://localhost:8000/playground)  
**Production:** [playground.cortex.bio](https://playground.cortex.bio)

Paste your API key, pick an endpoint, see the response.

---

## Get an API key

**Self-hosted:**

```bash
curl -X POST http://localhost:8000/api/keys \
  -H 'Content-Type: application/json' \
  -d '{"name":"my-app","tier":"free"}'
```

Returns `cb_test_...` (shown once). Use in `Authorization: Bearer` header.

---

## Why Cortex Bio?

```text
Apple Health · WHOOP · Oura · Garmin · Fitbit
                    ↓
               Cortex Bio
                    ↓
        Wearable Intelligence API
                    ↓
           Any app · Any agent · Any platform
```

Health platforms expose **raw metrics**. Cortex Bio exposes **readiness, chronotype, peak windows, and forecasts** — a more valuable API category for scheduling, agents, and research.

This is **not** a productivity app. It is open-source infrastructure for cognitive performance from wearable signals.

---

## Architecture

```text
HealthKit / wearables
        ↓
   Feature store          ← sleep, HRV, activity rollups
        ↓
   Intelligence layer     ← readiness, chronotype, windows
        ↓
   /v1 API                ← authenticated, rate-limited
        ↓
   Your app / agent
```

Open-source engine (MIT) · Proprietary Cortex integration (Atriveo) · See [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)

---

## Self-hosting

For researchers and teams who want full control:

```bash
git clone https://github.com/atriveo/cortex-bio.git
cd cortex-bio/db && npm install && cp .env.example .env
npm run db:migrate && npm run db:generate && npm run db:seed

cd ../api && npm install && cp .env.example .env && npm run dev
```

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Playground: `http://localhost:8000/playground`

Details: [ARCHITECTURE.md](ARCHITECTURE.md) · [api/README.md](api/README.md)

---

## Feature flags

Roll out capabilities gradually per deployment:

```bash
FEATURE_FORECASTING=true
FEATURE_ML=true
FEATURE_CORTEX=true   # proprietary integration
```

Check: `GET /features`

---

## Usage analytics

Every `/v1` request is logged (`api_requests` table) for latency and endpoint breakdown.

```bash
GET /api/keys/usage?days=7
```

---

## Repository structure

```text
cortex-bio/
├── api/           Wearable Intelligence API (Hono + TypeScript)
├── db/            Prisma schema + migrations (Neon PostgreSQL)
├── ml/            XGBoost training pipeline
├── ios/           Reference HealthKit client (SwiftUI)
├── sdk/           TypeScript + Python SDKs
├── playground/    Browser API tester
├── docs/          Extended documentation
└── README.md
```

---

## Roadmap

| Status | Milestone |
|--------|-----------|
| ✅ | Feature store, readiness, windows, ML, validation |
| ✅ | `/v1` API, API keys, OpenAPI, SDKs, playground |
| 🔜 | Hosted `api.cortex.bio` |
| 🔜 | Oura, WHOOP, Garmin adapters |

[ROADMAP.md](ROADMAP.md)

---

## Contributing

PRs welcome on the open-source engine. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — [LICENSE](LICENSE)

**Cortex Bio** by [Atriveo](https://atriveo.com). Engine is open source. Hosted API and Cortex integration are commercial.

---

<p align="center">
  <strong>The open-source infrastructure layer for wearable intelligence.</strong>
</p>
