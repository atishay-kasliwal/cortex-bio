-- Cortex Bio example queries
-- Replace :user_id with your user's UUID (from seed output or users table)

-- =============================================================================
-- 1. Today's readiness
-- =============================================================================

SELECT
    df.date,
    df.readiness_score,
    df.sleep_duration,
    df.avg_hrv,
    df.hrv_vs_baseline_pct,
    df.resting_hr,
    df.steps,
    df.feature_confidence
FROM daily_features df
WHERE df.user_id = :'user_id'
  AND df.date = CURRENT_DATE;

-- With prediction windows for today
SELECT
    p.prediction_date,
    p.readiness_score,
    p.peak_window_start,
    p.peak_window_end,
    p.secondary_window_start,
    p.secondary_window_end,
    p.crash_window_start,
    p.crash_window_end,
    p.confidence,
    p.model_version
FROM predictions p
WHERE p.user_id = :'user_id'
  AND p.prediction_date = CURRENT_DATE;

-- =============================================================================
-- 2. Last 30 days HRV trend
-- =============================================================================

SELECT
    df.date,
    df.avg_hrv,
    b.hrv_baseline_30d,
    df.hrv_vs_baseline_pct,
    df.readiness_score
FROM daily_features df
JOIN v_user_baselines b ON b.user_id = df.user_id
WHERE df.user_id = :'user_id'
  AND df.date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY df.date ASC;

-- =============================================================================
-- 3. Top performance drivers (insights ranked by impact)
-- =============================================================================

SELECT
    i.insight_type,
    i.title,
    i.metric_name,
    i.impact_pct,
    i.confidence,
    i.valid_from,
    i.valid_to
FROM insights i
WHERE i.user_id = :'user_id'
  AND (i.valid_to IS NULL OR i.valid_to >= CURRENT_DATE)
ORDER BY ABS(i.impact_pct) DESC NULLS LAST, i.confidence DESC NULLS LAST
LIMIT 10;

-- Correlation: sleep vs readiness (last 90 days)
SELECT
    CORR(df.sleep_duration, df.readiness_score) AS sleep_readiness_correlation,
    CORR(df.avg_hrv, df.readiness_score)        AS hrv_readiness_correlation,
    CORR(df.steps, df.readiness_score)          AS steps_readiness_correlation,
    COUNT(*)                                     AS sample_days
FROM daily_features df
WHERE df.user_id = :'user_id'
  AND df.date >= CURRENT_DATE - INTERVAL '90 days'
  AND df.readiness_score IS NOT NULL;

-- =============================================================================
-- 4. Deep work windows this week
-- =============================================================================

SELECT
    p.prediction_date,
    p.readiness_score,
    TO_CHAR(p.peak_window_start AT TIME ZONE u.timezone, 'HH24:MI') AS peak_start,
    TO_CHAR(p.peak_window_end AT TIME ZONE u.timezone, 'HH24:MI')   AS peak_end,
    TO_CHAR(p.secondary_window_start AT TIME ZONE u.timezone, 'HH24:MI') AS secondary_start,
    TO_CHAR(p.secondary_window_end AT TIME ZONE u.timezone, 'HH24:MI')   AS secondary_end,
    p.confidence
FROM predictions p
JOIN users u ON u.id = p.user_id
WHERE p.user_id = :'user_id'
  AND p.prediction_date >= DATE_TRUNC('week', CURRENT_DATE)
  AND p.prediction_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
ORDER BY p.prediction_date ASC;

-- =============================================================================
-- 5. Sleep versus readiness correlation (weekly rollup)
-- =============================================================================

SELECT
    wf.feature_date,
    wf.avg_sleep_7d,
    wf.avg_readiness_7d,
    wf.sleep_consistency_7d,
    wf.avg_hrv_7d
FROM v_weekly_features wf
WHERE wf.user_id = :'user_id'
  AND wf.feature_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY wf.feature_date ASC;

-- =============================================================================
-- 6. Prediction backtesting accuracy (last 30 days)
-- =============================================================================

SELECT
    AVG(p.prediction_error)              AS mae,
    AVG(ABS(p.prediction_error))           AS mean_abs_error,
    STDDEV_POP(p.prediction_error)         AS error_stddev,
    COUNT(*) FILTER (WHERE p.actual_score IS NOT NULL) AS scored_predictions
FROM predictions p
WHERE p.user_id = :'user_id'
  AND p.prediction_date >= CURRENT_DATE - INTERVAL '30 days';

-- =============================================================================
-- 7. Raw sample volume by metric (data quality check)
-- =============================================================================

SELECT
    metric_type,
    COUNT(*) AS sample_count,
    MIN(start_time) AS earliest,
    MAX(start_time) AS latest
FROM health_samples
WHERE user_id = :'user_id'
GROUP BY metric_type
ORDER BY sample_count DESC;

-- =============================================================================
-- 8. User baselines snapshot
-- =============================================================================

SELECT * FROM v_user_baselines WHERE user_id = :'user_id';
