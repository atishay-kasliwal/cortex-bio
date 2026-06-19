-- Phase 1: Ground truth collection

CREATE TABLE "daily_labels" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "productivity_score" SMALLINT NOT NULL,
    "energy_score" SMALLINT NOT NULL,
    "focus_score" SMALLINT NOT NULL,
    "mood_score" SMALLINT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_labels_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_labels_productivity_score_check" CHECK ("productivity_score" BETWEEN 1 AND 5),
    CONSTRAINT "daily_labels_energy_score_check" CHECK ("energy_score" BETWEEN 1 AND 5),
    CONSTRAINT "daily_labels_focus_score_check" CHECK ("focus_score" BETWEEN 1 AND 5),
    CONSTRAINT "daily_labels_mood_score_check" CHECK ("mood_score" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX "daily_labels_user_id_date_key" ON "daily_labels"("user_id", "date");
CREATE INDEX "daily_labels_user_id_date_idx" ON "daily_labels"("user_id", "date" DESC);

ALTER TABLE "daily_labels" ADD CONSTRAINT "daily_labels_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "duration_minutes" DOUBLE PRECISION;

COMMENT ON TABLE daily_labels IS 'Ground truth: one subjective rating set per day (Phase 1)';
