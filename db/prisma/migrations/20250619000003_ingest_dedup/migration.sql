-- Dedup index for append-only health_samples (re-sync safe)
CREATE UNIQUE INDEX IF NOT EXISTS health_samples_ingest_dedup_idx
    ON health_samples (
        user_id,
        metric_type,
        start_time,
        COALESCE(source_device, ''),
        COALESCE(metric_subtype, '')
    );

-- Workout dedup for re-sync
CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_start_end_idx
    ON workouts (user_id, start_time, end_time);
