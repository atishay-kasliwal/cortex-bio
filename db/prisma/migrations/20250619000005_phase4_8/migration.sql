-- Phase 4-8: Cognitive windows, Cortex metrics, ML pipeline

CREATE TABLE "cognitive_windows" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "peak_window_start" TIMESTAMPTZ(6),
    "peak_window_end" TIMESTAMPTZ(6),
    "secondary_window_start" TIMESTAMPTZ(6),
    "secondary_window_end" TIMESTAMPTZ(6),
    "crash_window_start" TIMESTAMPTZ(6),
    "crash_window_end" TIMESTAMPTZ(6),
    "meeting_window_start" TIMESTAMPTZ(6),
    "meeting_window_end" TIMESTAMPTZ(6),
    "recovery_window_start" TIMESTAMPTZ(6),
    "recovery_window_end" TIMESTAMPTZ(6),
    "hourly_curve" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION,
    "version" TEXT NOT NULL DEFAULT 'windows-v1',
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cognitive_windows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cognitive_windows_user_id_date_key" ON "cognitive_windows"("user_id", "date");
CREATE INDEX "cognitive_windows_user_id_date_idx" ON "cognitive_windows"("user_id", "date" DESC);

ALTER TABLE "cognitive_windows" ADD CONSTRAINT "cognitive_windows_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cortex_daily_metrics" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "deep_work_minutes" DOUBLE PRECISION,
    "attention_score" DOUBLE PRECISION,
    "context_switches" INTEGER,
    "coding_minutes" DOUBLE PRECISION,
    "writing_minutes" DOUBLE PRECISION,
    "research_minutes" DOUBLE PRECISION,
    "meeting_minutes" DOUBLE PRECISION,
    "output_score" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cortex_daily_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cortex_daily_metrics_user_id_date_key" ON "cortex_daily_metrics"("user_id", "date");
CREATE INDEX "cortex_daily_metrics_user_id_idx" ON "cortex_daily_metrics"("user_id");
CREATE INDEX "cortex_daily_metrics_date_idx" ON "cortex_daily_metrics"("date" DESC);

ALTER TABLE "cortex_daily_metrics" ADD CONSTRAINT "cortex_daily_metrics_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "model_runs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "model_version" TEXT NOT NULL,
    "training_start" DATE NOT NULL,
    "training_end" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "mae" JSONB NOT NULL DEFAULT '{}',
    "rmse" JSONB NOT NULL DEFAULT '{}',
    "feature_importance" JSONB NOT NULL DEFAULT '{}',
    "baseline_comparison" JSONB NOT NULL DEFAULT '{}',
    "beats_baselines" BOOLEAN NOT NULL DEFAULT false,
    "sample_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "model_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "model_runs_user_id_created_at_idx" ON "model_runs"("user_id", "created_at" DESC);

ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "performance_predictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "prediction_date" DATE NOT NULL,
    "predicted_attention" DOUBLE PRECISION,
    "predicted_deep_work_minutes" DOUBLE PRECISION,
    "predicted_output_score" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "model_version" TEXT NOT NULL,
    "feature_snapshot" JSONB NOT NULL DEFAULT '{}',
    "actual_attention" DOUBLE PRECISION,
    "actual_deep_work_minutes" DOUBLE PRECISION,
    "actual_output_score" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_predictions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "performance_predictions_user_date_model_key"
    ON "performance_predictions"("user_id", "prediction_date", "model_version");
CREATE INDEX "performance_predictions_user_id_prediction_date_idx"
    ON "performance_predictions"("user_id", "prediction_date" DESC);

ALTER TABLE "performance_predictions" ADD CONSTRAINT "performance_predictions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 6: Training dataset view (features + Cortex targets)
CREATE OR REPLACE VIEW v_training_dataset AS
SELECT
    df.user_id,
    df.date,
    df.sleep_duration,
    df.sleep_efficiency,
    df.avg_hrv,
    df.hrv_vs_baseline_pct,
    df.resting_hr,
    df.steps,
    df.exercise_minutes,
    df.readiness_score,
    EXTRACT(DOW FROM df.date)::INTEGER AS weekday,
    CASE
        WHEN u.chronotype_estimate IS NOT NULL
        THEN (u.chronotype_estimate::jsonb ->> 'classification')
        ELSE NULL
    END AS chronotype_classification,
    CASE
        WHEN u.chronotype_estimate IS NOT NULL
        THEN (u.chronotype_estimate::jsonb ->> 'avgWakeHour')::DOUBLE PRECISION
        ELSE NULL
    END AS chronotype_wake_hour,
    cm.deep_work_minutes,
    cm.attention_score,
    cm.output_score,
    cm.context_switches,
    cm.coding_minutes,
    cm.writing_minutes,
    cm.research_minutes,
    cm.meeting_minutes
FROM daily_features df
INNER JOIN users u ON u.id = df.user_id
LEFT JOIN cortex_daily_metrics cm
    ON cm.user_id = df.user_id AND cm.date = df.date
WHERE cm.attention_score IS NOT NULL
   OR cm.deep_work_minutes IS NOT NULL
   OR cm.output_score IS NOT NULL;

COMMENT ON VIEW v_training_dataset IS 'Phase 6: aligned features + Cortex targets for ML training';
