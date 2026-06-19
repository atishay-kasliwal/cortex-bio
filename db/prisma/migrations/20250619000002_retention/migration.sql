-- Data retention functions and archive table

CREATE TABLE IF NOT EXISTS health_samples_archive (
    LIKE health_samples INCLUDING ALL
);

CREATE OR REPLACE FUNCTION apply_health_sample_retention(
    retention_days INTEGER DEFAULT 730
)
RETURNS TABLE(archived_count BIGINT, deleted_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff TIMESTAMPTZ;
    v_archived BIGINT;
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

    RETURN QUERY SELECT v_archived, v_archived;
END;
$$;

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
