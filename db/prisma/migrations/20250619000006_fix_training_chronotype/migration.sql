-- Fix chronotype parsing in training dataset view (handles JSON object or plain classification string)
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
        WHEN u.chronotype_estimate IS NULL THEN NULL
        WHEN u.chronotype_estimate LIKE '{%'
        THEN (u.chronotype_estimate::jsonb ->> 'classification')
        ELSE u.chronotype_estimate
    END AS chronotype_classification,
    CASE
        WHEN u.chronotype_estimate IS NULL THEN NULL
        WHEN u.chronotype_estimate LIKE '{%'
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
