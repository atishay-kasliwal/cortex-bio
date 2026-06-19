-- Phase 9: Prediction validation system

CREATE TABLE "prediction_validations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "model_version" TEXT NOT NULL,
    "prediction_date" DATE NOT NULL,
    "target_type" TEXT NOT NULL,
    "predicted_value" DOUBLE PRECISION NOT NULL,
    "actual_value" DOUBLE PRECISION NOT NULL,
    "absolute_error" DOUBLE PRECISION NOT NULL,
    "percentage_error" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_validations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prediction_validations_user_id_model_version_prediction_date_target_type_key"
    ON "prediction_validations"("user_id", "model_version", "prediction_date", "target_type");
CREATE INDEX "prediction_validations_user_id_prediction_date_idx"
    ON "prediction_validations"("user_id", "prediction_date" DESC);
CREATE INDEX "prediction_validations_user_id_target_type_prediction_date_idx"
    ON "prediction_validations"("user_id", "target_type", "prediction_date" DESC);

ALTER TABLE "prediction_validations" ADD CONSTRAINT "prediction_validations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "validation_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "model_version" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "date_range_start" DATE NOT NULL,
    "date_range_end" DATE NOT NULL,
    "mae" DOUBLE PRECISION NOT NULL,
    "rmse" DOUBLE PRECISION NOT NULL,
    "correlation" DOUBLE PRECISION,
    "beats_baselines" BOOLEAN NOT NULL DEFAULT false,
    "baseline_mae" JSONB NOT NULL DEFAULT '{}',
    "sample_count" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "validation_metrics_user_id_model_version_target_type_date_range_key"
    ON "validation_metrics"("user_id", "model_version", "target_type", "date_range_start", "date_range_end");
CREATE INDEX "validation_metrics_user_id_computed_at_idx"
    ON "validation_metrics"("user_id", "computed_at" DESC);

ALTER TABLE "validation_metrics" ADD CONSTRAINT "validation_metrics_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
