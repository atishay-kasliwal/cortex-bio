# Cortex Bio API

Self-hosted ingest and intelligence API for the [Cortex Bio](https://github.com/atriveo/cortex-bio) wearable intelligence platform.

> **Open source layer:** HealthKit ingest, feature store, readiness, windows, forecast, analytics, ML scaffolding, and validation.  
> **Proprietary layer:** Cortex telemetry ingest (`/api/cortex/*`) requires Atriveo Cortex for production ground truth. See [docs/OPEN_SOURCE.md](../docs/OPEN_SOURCE.md).

Full API vision (including future `/v1` hosted routes): [docs/API.md](../docs/API.md)

## Phases

| Phase | Status | Focus |
|-------|--------|-------|
| 0 | Done | HealthKit → feature store |
| 1 | Done | Daily labels + work sessions |
| 2 | Done | Correlations + personal insights |
| 3 | Done | Rules-based readiness (no ML) |
| 4 | Done | Cognitive window discovery |
| 5 | Done | Cortex daily metrics ingest |
| 6 | Done | Training dataset alignment (`v_training_dataset`) |
| 7 | Done | XGBoost / ridge ML + tomorrow predictions |
| 8 | Done | 24-hour performance forecast |
| 9 | Done | Prediction validation + baseline proof |
| 10 | Done | Public `/v1` Wearable Intelligence API |

## Endpoints

### Phase 0 — Ingest

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sync` | Ingest HealthKit + compute features |
| `GET` | `/api/features/daily/:date` | Daily feature vector |
| `GET` | `/api/baselines` | 30-day baselines + chronotype |

### Phase 1 — Ground truth

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/api/labels/:date` | Upsert daily label (1–5 scores) |
| `GET` | `/api/labels/progress` | Progress toward 30 labels / 100 sessions |
| `POST` | `/api/sessions` | Start work session |
| `PATCH` | `/api/sessions/:id/end` | End session with quality rating |

### Phase 2 — Analytics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/correlations` | Pearson correlations (features ↔ labels) |
| `POST` | `/api/analytics/insights/generate` | Generate + persist insights |
| `GET` | `/api/analytics/insights` | List insights |

### Phase 3 — Readiness

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/readiness/today` | Readiness score + contributors |
| `GET` | `/api/readiness/:date` | Readiness for a date |

### Phase 4 — Cognitive windows

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/windows/today` | Today's hourly cognitive curve + peak/crash windows |
| `GET` | `/api/windows/history` | Historical cognitive windows |
| `GET` | `/api/windows/:date` | Windows for a specific date |
| `POST` | `/api/windows/compute/:date` | Recompute windows for a date |

### Phase 5 — Cortex integration

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/cortex/daily` | Import Cortex daily metrics (batch, up to 500 rows) |
| `GET` | `/api/cortex/dataset` | Aligned training rows from `v_training_dataset` |
| `GET` | `/api/cortex/dataset/stats` | Dataset coverage stats |

### Phase 6–7 — ML

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ml/train` | Train XGBoost (falls back to ridge if Python unavailable) |
| `GET` | `/api/ml/runs` | Model run history + baseline validation |
| `GET` | `/api/predictions/tomorrow` | Predicted attention, deep work, output for tomorrow |
| `GET` | `/api/predictions/history` | Past performance predictions |

### Phase 8 — Forecast

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/forecast/today` | 24-hour performance forecast + best windows |

### Phase 9 — Prediction validation

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/validation/summary` | Aggregated MAE/RMSE/correlation + ML vs baseline verdict |
| `GET` | `/api/validation/history` | Per-prediction outcomes + accuracy-over-time series |
| `GET` | `/api/validation/features` | Feature importance + baseline comparison from latest model run |
| `POST` | `/api/validation/compute` | Backfill validations from predictions + Cortex actuals |

Validation runs automatically when Cortex data is ingested via `POST /api/cortex/daily`.

## Wearable Intelligence API (v1)

All `/v1` routes require:

```http
Authorization: Bearer cb_test_...
```

### Health

| Method | Path |
|--------|------|
| `GET` | `/v1/readiness/today` |
| `GET` | `/v1/readiness/history?days=30` |
| `GET` | `/v1/baselines` |
| `GET` | `/v1/chronotype` |

### Windows & forecast

| Method | Path |
|--------|------|
| `GET` | `/v1/windows/today` |
| `GET` | `/v1/windows/week` |
| `GET` | `/v1/forecast` |

### Analytics

| Method | Path |
|--------|------|
| `GET` | `/v1/insights` |
| `GET` | `/v1/correlations` |
| `GET` | `/v1/trends?days=30` |

### ML

| Method | Path |
|--------|------|
| `GET` | `/v1/predictions/tomorrow` |
| `GET` | `/v1/predictions/week` |
| `GET` | `/v1/models/status` |

### Cortex (proprietary integration)

| Method | Path |
|--------|------|
| `POST` | `/v1/cortex/sessions` |
| `POST` | `/v1/cortex/telemetry` |
| `GET` | `/v1/cortex/performance` |

### API keys (self-hosted admin)

| Method | Path |
|--------|------|
| `POST` | `/api/keys` |
| `GET` | `/api/keys` |
| `DELETE` | `/api/keys/:id` |

```bash
npm run keys:create -- "my-integration" free
```

Rate limits: free 60/min, pro 600/min, enterprise 6000/min (configurable per key at creation).

## Setup

```bash
cd cortex-bio/db && npm install && npm run db:migrate && npm run db:generate
cd ../api && cp .env.example .env
npm install && npm run dev
```

### ML pipeline (optional XGBoost)

```bash
pip install -r cortex-bio/ml/requirements.txt
python3 cortex-bio/ml/evaluate.py   # print latest model run metrics
```

Models must beat yesterday, 7-day rolling average, and rules-based readiness baselines (`beats_baselines=true` in `model_runs`).

## Phase 1 goal

After 30 days: **30 daily labels** + **100+ rated work sessions**.

Check progress: `GET /api/labels/progress`

## Phase 2 analytics

Requires ≥14 days with both `daily_features` and `daily_labels`.

Generate insights: `POST /api/analytics/insights/generate`

## Phase 5+ workflow

1. Import Cortex telemetry: `POST /api/cortex/daily` with `{ "records": [...] }`
2. Train model: `POST /api/ml/train`
3. Get tomorrow's prediction: `GET /api/predictions/tomorrow`
4. Get today's hourly forecast: `GET /api/forecast/today`
