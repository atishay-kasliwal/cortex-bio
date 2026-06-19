# Roadmap

Cortex Bio evolves from a self-hosted research stack into the **open-source infrastructure layer for wearable intelligence**, with a hosted API platform and proprietary Cortex integration on top.

## Vision

```text
Apple Health · WHOOP · Oura · Garmin · Fitbit
                    ↓
               Cortex Bio
                    ↓
        Wearable Intelligence API
                    ↓
           Any App · Any Agent · Any Platform
```

---

## Shipped (Phases 0–9)

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 0 | HealthKit ingest, feature store, baselines | ✅ |
| 1 | Daily labels, work sessions (ground truth) | ✅ |
| 2 | Correlations, personal insights | ✅ |
| 3 | Rules-based readiness (`rules-v1`) | ✅ |
| 4 | Cognitive window discovery | ✅ |
| 5 | Cortex daily metrics ingest (integration stub) | ✅ |
| 6 | `v_training_dataset` alignment view | ✅ |
| 7 | XGBoost ML + tomorrow predictions | ✅ |
| 8 | 24-hour performance forecast | ✅ |
| 9 | Prediction validation + baseline proof | ✅ |

---

## Phase 10 — Public API platform ✅

Hosted **Wearable Intelligence API** with stable `/v1` routes and API key authentication.

### Health APIs

```text
GET /v1/readiness/today
GET /v1/readiness/history
GET /v1/baselines
GET /v1/chronotype
```

### Cognitive window APIs

```text
GET /v1/windows/today
GET /v1/windows/week
GET /v1/forecast
```

### Analytics APIs

```text
GET /v1/insights
GET /v1/correlations
GET /v1/trends
```

### ML APIs

```text
GET /v1/predictions/tomorrow
GET /v1/predictions/week
GET /v1/models/status
```

### Cortex APIs (proprietary)

```text
POST /v1/cortex/sessions
POST /v1/cortex/telemetry
GET  /v1/cortex/performance
```

**Shipped:**

- Bearer API keys (`cb_test_*`, `cb_live_*`) with SHA-256 hashing
- Per-key rate limiting (60/min free, configurable per tier)
- `POST /api/keys` for key issuance (self-hosted)
- `npm run keys:create` CLI

---

## Phase 11 — Multi-wearable adapters (Q4 2026)

| Source | Method |
|--------|--------|
| Apple Health | HealthKit (shipped) |
| Oura | OAuth + Oura API v2 |
| WHOOP | WHOOP API |
| Garmin | Health API |
| Fitbit | Web API |

Normalize all sources into `health_samples` + `sleep_sessions` so the feature engine stays device-agnostic.

---

## Phase 12 — Open datasets (2027)

- Export anonymized longitudinal feature datasets for research
- Standard schema documentation (JSON Schema / Parquet)
- Baseline benchmark tasks: predict next-day HRV, sleep efficiency, self-reported focus

---

## Phase 13 — Agent SDK (2027)

```typescript
import { CortexBio } from '@atriveo/cortex-bio-sdk';

const readiness = await cortex.readiness.today();
const windows = await cortex.windows.today();
```

For LLM agents and automation tools scheduling deep work from biometrics.

---

## Proprietary track (Atriveo Cortex)

Parallel to OSS roadmap, not in this repository:

| Milestone | Description |
|-----------|-------------|
| Cortex desktop agent | Attention, context switching, deep work measurement |
| Production scoring models | Trained on proprietary Cortex datasets |
| Commercial validation | Prove biometrics → real knowledge-work output |
| Enterprise API | SLA, SSO, team dashboards |

---

## How to influence the roadmap

- Open a [GitHub Discussion](https://github.com/atriveo/cortex-bio/discussions) for feature requests
- PRs welcome for OSS engine layer — see [CONTRIBUTING.md](./CONTRIBUTING.md)
- Commercial Cortex features: contact Atriveo

---

## Success metrics

| Horizon | Metric |
|---------|--------|
| Research (now) | 90+ days clean longitudinal data per user |
| OSS adoption | GitHub stars, self-hosted deployments, PRs |
| API platform | Active API keys, p95 latency < 200ms |
| Science | Published validation: ML beats baselines on real outcomes |
