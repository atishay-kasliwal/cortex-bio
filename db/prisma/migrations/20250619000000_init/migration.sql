-- CreateEnum
CREATE TYPE "SessionQuality" AS ENUM ('poor', 'average', 'good', 'great');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('top_driver', 'peak_hour', 'crash_window', 'chronotype', 'sleep_impact', 'hrv_impact', 'activity_impact', 'trend');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "onboarding_completed_at" TIMESTAMPTZ(6),
    "chronotype_estimate" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_samples" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "metric_type" TEXT NOT NULL,
    "metric_subtype" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6),
    "source_device" TEXT,
    "source_app" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "sleep_start" TIMESTAMPTZ(6) NOT NULL,
    "sleep_end" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" DOUBLE PRECISION NOT NULL,
    "rem_minutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deep_minutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "core_minutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "awake_minutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sleep_efficiency" DOUBLE PRECISION,
    "source_device" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sleep_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workout_type" TEXT NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" DOUBLE PRECISION NOT NULL,
    "calories" DOUBLE PRECISION,
    "avg_heart_rate" DOUBLE PRECISION,
    "max_heart_rate" DOUBLE PRECISION,
    "source_device" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_features" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "sleep_duration" DOUBLE PRECISION,
    "sleep_efficiency" DOUBLE PRECISION,
    "sleep_debt_hours" DOUBLE PRECISION,
    "avg_hrv" DOUBLE PRECISION,
    "hrv_vs_baseline_pct" DOUBLE PRECISION,
    "resting_hr" DOUBLE PRECISION,
    "steps" DOUBLE PRECISION,
    "exercise_minutes" DOUBLE PRECISION,
    "active_calories" DOUBLE PRECISION,
    "readiness_score" DOUBLE PRECISION,
    "checkin_count" INTEGER NOT NULL DEFAULT 0,
    "feature_confidence" DOUBLE PRECISION,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hourly_features" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "timestamp_hour" TIMESTAMPTZ(6) NOT NULL,
    "avg_heart_rate" DOUBLE PRECISION,
    "avg_hrv" DOUBLE PRECISION,
    "steps" DOUBLE PRECISION,
    "activity_score" DOUBLE PRECISION,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hourly_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "session_quality" "SessionQuality",
    "project_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "prediction_date" DATE NOT NULL,
    "readiness_score" DOUBLE PRECISION NOT NULL,
    "peak_window_start" TIMESTAMPTZ(6),
    "peak_window_end" TIMESTAMPTZ(6),
    "secondary_window_start" TIMESTAMPTZ(6),
    "secondary_window_end" TIMESTAMPTZ(6),
    "crash_window_start" TIMESTAMPTZ(6),
    "crash_window_end" TIMESTAMPTZ(6),
    "confidence" DOUBLE PRECISION,
    "model_version" TEXT NOT NULL,
    "actual_score" DOUBLE PRECISION,
    "prediction_error" DOUBLE PRECISION,
    "feature_snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "insight_type" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric_name" TEXT,
    "impact_pct" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "health_samples_user_id_idx" ON "health_samples"("user_id");

-- CreateIndex
CREATE INDEX "health_samples_metric_type_idx" ON "health_samples"("metric_type");

-- CreateIndex
CREATE INDEX "health_samples_start_time_idx" ON "health_samples"("start_time" DESC);

-- CreateIndex
CREATE INDEX "health_samples_user_id_metric_type_start_time_idx" ON "health_samples"("user_id", "metric_type", "start_time" DESC);

-- CreateIndex
CREATE INDEX "sleep_sessions_user_id_idx" ON "sleep_sessions"("user_id");

-- CreateIndex
CREATE INDEX "sleep_sessions_sleep_start_idx" ON "sleep_sessions"("sleep_start" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sleep_sessions_user_id_sleep_start_sleep_end_key" ON "sleep_sessions"("user_id", "sleep_start", "sleep_end");

-- CreateIndex
CREATE INDEX "workouts_user_id_idx" ON "workouts"("user_id");

-- CreateIndex
CREATE INDEX "workouts_workout_type_idx" ON "workouts"("workout_type");

-- CreateIndex
CREATE INDEX "workouts_start_time_idx" ON "workouts"("start_time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_features_user_id_date_key" ON "daily_features"("user_id", "date");

-- CreateIndex
CREATE INDEX "daily_features_user_id_date_idx" ON "daily_features"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "hourly_features_user_id_timestamp_hour_key" ON "hourly_features"("user_id", "timestamp_hour");

-- CreateIndex
CREATE INDEX "hourly_features_user_id_timestamp_hour_idx" ON "hourly_features"("user_id", "timestamp_hour" DESC);

-- CreateIndex
CREATE INDEX "work_sessions_user_id_idx" ON "work_sessions"("user_id");

-- CreateIndex
CREATE INDEX "work_sessions_started_at_idx" ON "work_sessions"("started_at" DESC);

-- CreateIndex
CREATE INDEX "predictions_user_id_idx" ON "predictions"("user_id");

-- CreateIndex
CREATE INDEX "predictions_prediction_date_idx" ON "predictions"("prediction_date" DESC);

-- CreateIndex
CREATE INDEX "predictions_user_id_prediction_date_idx" ON "predictions"("user_id", "prediction_date" DESC);

-- CreateIndex
CREATE INDEX "insights_user_id_idx" ON "insights"("user_id");

-- CreateIndex
CREATE INDEX "insights_insight_type_idx" ON "insights"("insight_type");

-- CreateIndex
CREATE INDEX "insights_user_id_insight_type_valid_from_idx" ON "insights"("user_id", "insight_type", "valid_from" DESC);

-- AddForeignKey
ALTER TABLE "health_samples" ADD CONSTRAINT "health_samples_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_sessions" ADD CONSTRAINT "sleep_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_features" ADD CONSTRAINT "daily_features_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hourly_features" ADD CONSTRAINT "hourly_features_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Append-only policy for raw health data (application-enforced; see retention.sql
-- for scheduled archival of records older than retention window)
-- ---------------------------------------------------------------------------

COMMENT ON TABLE health_samples IS 'Append-only raw Apple Health samples. INSERT only from ingest pipeline.';
COMMENT ON TABLE daily_features IS 'Computed feature layer. Safe to upsert on nightly recompute.';
COMMENT ON TABLE predictions IS 'Readiness forecasts with backtesting fields (actual_score, prediction_error).';

-- BRIN index for time-series scans on large health_samples tables (Neon-compatible)
CREATE INDEX health_samples_start_time_brin_idx ON health_samples USING BRIN (start_time);
