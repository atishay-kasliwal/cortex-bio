-- Cortex Bio data retention strategy
-- Neon PostgreSQL compatible (no TimescaleDB required)
--
-- Policy:
--   health_samples (raw):   retain 24 months, then archive + delete
--   sleep_sessions/workouts: retain 36 months
--   daily/hourly features:  retain indefinitely (small footprint)
--   predictions/insights:   retain indefinitely
--
-- Run manually or schedule via pg_cron / external cron:
--   npm run db:retention
--
-- Future optimization: convert health_samples to native range partitioning
-- by month (PARTITION BY RANGE (start_time)) when row count exceeds ~10M.

-- ---------------------------------------------------------------------------
-- Archive table for raw samples (cold storage within same database)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS health_samples_archive (
    LIKE health_samples INCLUDING ALL
);

COMMENT ON TABLE health_samples_archive IS 'Archived raw health samples moved after retention window';

-- ---------------------------------------------------------------------------
-- Retention function: move old raw samples to archive, then delete from hot table
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION apply_health_sample_retention(
    retention_days INTEGER DEFAULT 730
)
RETURNS TABLE(archived_count BIGINT, deleted_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_archived BIGINT;
    v_deleted BIGINT;
BEGIN
    v_cutoff := NOW() - (retention_days || ' days')::INTERVAL;

    WITH moved AS (
        DELETE FROM health_samples
        WHERE start_time < v_cutoff
        RETURNING *
    ),
    inserted AS (
        INSERT INTO health_samples_archive
        SELECT * FROM moved
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_archived FROM inserted;

    v_deleted := v_archived;

    RETURN QUERY SELECT v_archived, v_deleted;
END;
$$;

COMMENT ON FUNCTION apply_health_sample_retention IS
    'Move health_samples older than retention_days (default 730) to archive table';

-- ---------------------------------------------------------------------------
-- Retention for derived session tables
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION apply_session_retention(
    retention_days INTEGER DEFAULT 1095
)
RETURNS TABLE(sleep_deleted BIGINT, workout_deleted BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_sleep BIGINT;
    v_workout BIGINT;
BEGIN
    v_cutoff := NOW() - (retention_days || ' days')::INTERVAL;

    DELETE FROM sleep_sessions WHERE sleep_start < v_cutoff;
    GET DIAGNOSTICS v_sleep = ROW_COUNT;

    DELETE FROM workouts WHERE start_time < v_cutoff;
    GET DIAGNOSTICS v_workout = ROW_COUNT;

    RETURN QUERY SELECT v_sleep, v_workout;
END;
$$;

-- ---------------------------------------------------------------------------
-- Example execution (uncomment to run):
-- SELECT * FROM apply_health_sample_retention(730);
-- SELECT * FROM apply_session_retention(1095);
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Optional: monthly partitioning template (apply when scaling beyond MVP)
-- ---------------------------------------------------------------------------
--
-- CREATE TABLE health_samples_partitioned (LIKE health_samples INCLUDING ALL)
--   PARTITION BY RANGE (start_time);
--
-- CREATE TABLE health_samples_y2026m01 PARTITION OF health_samples_partitioned
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
--
-- Drop oldest partition instead of row-by-row delete:
--   DROP TABLE health_samples_y2024m01;
