# Cortex Bio Database Foundation

Neon PostgreSQL + Prisma ORM + TypeScript. Standard PostgreSQL only — no MongoDB, Firebase, or Supabase-specific features.

## Architecture

```text
Layer 1 — Raw (append-only)
  health_samples, sleep_sessions, workouts

Layer 2 — Features (computed, upsert OK)
  daily_features, hourly_features

Layer 3 — Insights
  predictions, insights, views (baselines / weekly / monthly)

Layer 4 — Future (Atriveo Cortex)
  work_sessions
```

## ER Diagram

```mermaid
erDiagram
    users ||--o{ health_samples : has
    users ||--o{ sleep_sessions : has
    users ||--o{ workouts : has
    users ||--o{ daily_features : has
    users ||--o{ hourly_features : has
    users ||--o{ work_sessions : has
    users ||--o{ predictions : has
    users ||--o{ insights : has

    users {
        uuid id PK
        string email UK
        string timezone
        timestamptz created_at
        timestamptz updated_at
        timestamptz onboarding_completed_at
        string chronotype_estimate
    }

    health_samples {
        uuid id PK
        uuid user_id FK
        string metric_type
        string metric_subtype
        float value
        string unit
        timestamptz start_time
        timestamptz end_time
        string source_device
        string source_app
        jsonb metadata
        timestamptz created_at
    }

    sleep_sessions {
        uuid id PK
        uuid user_id FK
        timestamptz sleep_start
        timestamptz sleep_end
        float duration_minutes
        float rem_minutes
        float deep_minutes
        float core_minutes
        float awake_minutes
        float sleep_efficiency
    }

    workouts {
        uuid id PK
        uuid user_id FK
        string workout_type
        timestamptz start_time
        timestamptz end_time
        float duration_minutes
        float calories
        float avg_heart_rate
        float max_heart_rate
    }

    daily_features {
        uuid id PK
        uuid user_id FK
        date date UK
        float sleep_duration
        float avg_hrv
        float readiness_score
        float feature_confidence
    }

    hourly_features {
        uuid id PK
        uuid user_id FK
        timestamptz timestamp_hour UK
        float avg_heart_rate
        float avg_hrv
        float activity_score
    }

    predictions {
        uuid id PK
        uuid user_id FK
        date prediction_date
        float readiness_score
        timestamptz peak_window_start
        timestamptz peak_window_end
        string model_version
        float actual_score
        float prediction_error
    }

    insights {
        uuid id PK
        uuid user_id FK
        enum insight_type
        string title
        float impact_pct
        float confidence
        date valid_from
    }

    work_sessions {
        uuid id PK
        uuid user_id FK
        timestamptz started_at
        enum session_quality
        string project_name
    }
```

## Quick start (Neon)

### 1. Configure connection

```bash
cd cortex-bio/db
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to your Neon connection string:

```text
postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

Use the **pooled** endpoint for application runtime. For migrations, Neon recommends a direct connection if you hit pooler limits — add `DIRECT_URL` to `.env` and `directUrl = env("DIRECT_URL")` in `schema.prisma` if needed.

### 2. Install and migrate

```bash
npm install
npm run db:migrate      # applies all SQL migrations
npm run db:generate     # generates Prisma Client
npm run db:seed         # 90 days of realistic sample data
```

### 3. Verify

```bash
npm run db:studio       # browse data in Prisma Studio
```

Or connect with psql:

```bash
psql "$DATABASE_URL"
```

```sql
SELECT email, chronotype_estimate FROM users;
SELECT COUNT(*) FROM health_samples;
SELECT * FROM v_user_baselines;
```

## Deliverables

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Type-safe ORM models |
| `prisma/migrations/` | Versioned SQL migrations |
| `prisma/seed.ts` | 90 days sleep/HRV/activity + 30 predictions + 10 insights |
| `sql/views.sql` | Standalone view definitions (also in migration) |
| `sql/retention.sql` | Archive + retention functions (also in migration) |
| `sql/example-queries.sql` | Production query templates |
| `src/index.ts` | Re-export Prisma client + types |

## Tables

| Table | Layer | Notes |
|-------|-------|-------|
| `users` | Auth | Multi-user ready; MVP seeds one user |
| `health_samples` | Raw | Append-only. BRIN index on `start_time` |
| `sleep_sessions` | Raw | Structured sleep with stages |
| `workouts` | Raw | Workout summaries |
| `daily_features` | Feature | One row per user per day |
| `hourly_features` | Feature | One row per user per hour |
| `predictions` | Insights | Readiness + focus windows + backtesting |
| `insights` | Insights | Correlation / chronotype discoveries |
| `work_sessions` | Future | Cortex-compatible session labels |

## Views

| View | Contents |
|------|----------|
| `v_user_baselines` | 30-day HRV, resting HR, sleep, steps baselines |
| `v_weekly_features` | Rolling 7-day averages + sleep consistency |
| `v_monthly_features` | Rolling 30-day lifestyle baselines |

## Data retention

| Data | Retention | Mechanism |
|------|-----------|-----------|
| `health_samples` | 24 months | `apply_health_sample_retention(730)` → archive table |
| `sleep_sessions`, `workouts` | 36 months | `apply_session_retention(1095)` |
| `daily_features`, `hourly_features` | Indefinite | Small footprint |
| `predictions`, `insights` | Indefinite | Audit trail |

```sql
SELECT * FROM apply_health_sample_retention(730);
SELECT * FROM apply_session_retention(1095);
```

**Future scaling:** convert `health_samples` to native PostgreSQL range partitioning by month. Template documented in `sql/retention.sql`.

## Metric types (Phase 0+)

`health_samples.metric_type` values used by Cortex Bio:

- `heart_rate`, `resting_heart_rate`, `hrv`
- `respiratory_rate`, `spo2`, `wrist_temperature`
- `steps`, `active_energy`, `exercise_minutes`

## Example queries

See [`sql/example-queries.sql`](sql/example-queries.sql):

1. Today's readiness
2. Last 30 days HRV trend
3. Top performance drivers
4. Deep work windows this week
5. Sleep vs readiness correlation

Replace `:'user_id'` with your UUID from the seed output.

## TypeScript usage

```typescript
import { PrismaClient } from '@cortex-bio/db';

const prisma = new PrismaClient();

const today = await prisma.dailyFeature.findFirst({
  where: { userId: '...', date: new Date() },
  include: { user: true },
});
```

## Seed data summary

After `npm run db:seed`:

- 1 user (`founder@cortex.bio`)
- ~90 sleep sessions
- ~90 daily feature rows
- ~810 hourly feature rows (9 hours × 90 days)
- ~1,500+ health samples (HRV, HR, steps, vitals)
- ~40 workouts
- 30 predictions with backtesting fields
- 10 insights
- 15 work sessions

## Security note

Never commit `.env` with real credentials. Rotate your Neon password if it was shared in chat or logs.
