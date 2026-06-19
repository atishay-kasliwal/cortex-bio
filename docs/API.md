# API Reference

Cortex Bio exposes two API surfaces:

| Surface | Prefix | Hosting | Status |
|---------|--------|---------|--------|
| **Self-hosted** | `/api` | Your infrastructure | ✅ Shipped |
| **Wearable Intelligence API** | `/v1` | Atriveo (Neon) | 🔜 Phase 10 |

---

## Wearable Intelligence API (v1) — shipped

Base URL: same host as self-hosted API. All routes require API key authentication.

```http
Authorization: Bearer cb_test_...
```

| Surface | Prefix | Auth | Status |
|---------|--------|------|--------|
| **Wearable Intelligence API** | `/v1` | Bearer API key | ✅ Shipped |
| **Self-hosted (legacy)** | `/api` | None (dev) | ✅ Shipped |

### Health

```http
GET /health
```

```json
{ "status": "ok", "service": "cortex-bio-api", "phase": "9" }
```

---

### Ingest

```http
POST /api/sync
Content-Type: application/json
```

Ingest HealthKit batch and recompute features. See [api/README.md](../api/README.md) for payload schema.

---

### Readiness

```http
GET /api/readiness/today
GET /api/readiness/:date
```

Explainable cognitive readiness score with contributors and focus windows.

**Future v1 mapping:**

```http
GET /v1/readiness/today
GET /v1/readiness/history
GET /v1/baselines
GET /v1/chronotype
```

---

### Cognitive windows

```http
GET /api/windows/today
GET /api/windows/history
GET /api/windows/:date
POST /api/windows/compute/:date
```

Hourly cognitive performance curve with peak, secondary, crash, meeting, and recovery windows.

**Future v1 mapping:**

```http
GET /v1/windows/today
GET /v1/windows/week
GET /v1/forecast
```

---

### Analytics

```http
GET /api/analytics/correlations
POST /api/analytics/insights/generate
GET /api/analytics/insights
```

**Future v1 mapping:**

```http
GET /v1/insights
GET /v1/correlations
GET /v1/trends
```

---

### ML and predictions

```http
POST /api/ml/train
GET /api/ml/runs
GET /api/predictions/tomorrow
GET /api/predictions/history
GET /api/forecast/today
```

**Future v1 mapping:**

```http
GET /v1/predictions/tomorrow
GET /v1/predictions/week
GET /v1/models/status
```

---

### Validation

```http
GET /api/validation/summary
GET /api/validation/history
GET /api/validation/features
POST /api/validation/compute
```

Tracks prediction accuracy and proves whether ML beats baseline heuristics.

---

## Proprietary endpoints

These routes exist in the self-hosted reference API as **integration stubs**. Production Cortex telemetry and scoring require the proprietary Atriveo layer.

```http
POST /api/cortex/daily
GET  /api/cortex/dataset
GET  /api/cortex/dataset/stats
```

**Future v1 (proprietary):**

```http
POST /v1/cortex/sessions
POST /v1/cortex/telemetry
GET  /v1/cortex/performance
```

| Endpoint | OSS | With Cortex license |
|----------|-----|---------------------|
| Ingest structure | ✅ Schema + stub routes | ✅ Real telemetry |
| Ground truth | Self-reported labels | Cortex performance metrics |
| ML targets | Seed / your data | Production datasets |
| Validation | Against your actuals | Against Cortex actuals |

See [OPEN_SOURCE.md](./OPEN_SOURCE.md).

---

## Authentication (future v1)

Self-hosted: no auth (use network isolation).

Hosted `/v1`:

```http
Authorization: Bearer cb_live_...
```

Per-user data isolation via API key → `user_id` mapping.

---

## Error format

```json
{
  "message": "No daily features for this date"
}
```

HTTP status codes: `400` validation, `404` not found, `500` server error.

---

## Rate limits (future v1)

| Tier | Requests/min |
|------|----------------|
| Free | 60 |
| Pro | 600 |
| Enterprise | Custom |

---

## OpenAPI

Planned: `docs/openapi/v1.yaml` generated from route definitions.

For now, the authoritative list is [api/README.md](../api/README.md).
