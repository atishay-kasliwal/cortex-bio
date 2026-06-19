-- Analytics views (Neon-compatible standard PostgreSQL)

CREATE OR REPLACE VIEW v_user_baselines AS
SELECT
    df.user_id,
    AVG(df.avg_hrv) FILTER (
        WHERE df.date >= CURRENT_DATE - INTERVAL '30 days'
          AND df.avg_hrv IS NOT NULL
    )                                                   AS hrv_baseline_30d,
    STDDEV_POP(df.avg_hrv) FILTER (
        WHERE df.date >= CURRENT_DATE - INTERVAL '30 days'
          AND df.avg_hrv IS NOT NULL
    )                                                   AS hrv_stddev_30d,
    AVG(df.resting_hr) FILTER (
        WHERE df.date >= CURRENT_DATE - INTERVAL '30 days'
          AND df.resting_hr IS NOT NULL
    )                                                   AS resting_hr_baseline_30d,
    AVG(df.sleep_duration) FILTER (
        WHERE df.date >= CURRENT_DATE - INTERVAL '30 days'
          AND df.sleep_duration IS NOT NULL
    )                                                   AS sleep_baseline_30d,
    AVG(df.steps) FILTER (
        WHERE df.date >= CURRENT_DATE - INTERVAL '30 days'
          AND df.steps IS NOT NULL
    )                                                   AS steps_baseline_30d,
    AVG(df.readiness_score) FILTER (
        WHERE df.date >= CURRENT_DATE - INTERVAL '30 days'
          AND df.readiness_score IS NOT NULL
    )                                                   AS readiness_baseline_30d,
    COUNT(*) FILTER (
        WHERE df.date >= CURRENT_DATE - INTERVAL '30 days'
    )::INTEGER                                          AS sample_days_30d
FROM daily_features df
GROUP BY df.user_id;

CREATE OR REPLACE VIEW v_weekly_features AS
SELECT
    df.user_id,
    df.date                                               AS feature_date,
    AVG(df.sleep_duration) OVER w                         AS avg_sleep_7d,
    AVG(df.sleep_efficiency) OVER w                       AS avg_sleep_efficiency_7d,
    AVG(df.avg_hrv) OVER w                                AS avg_hrv_7d,
    AVG(df.resting_hr) OVER w                             AS avg_resting_hr_7d,
    AVG(df.steps) OVER w                                  AS avg_steps_7d,
    AVG(df.exercise_minutes) OVER w                       AS avg_exercise_minutes_7d,
    AVG(df.readiness_score) OVER w                        AS avg_readiness_7d,
    STDDEV_POP(df.sleep_duration) OVER w                  AS sleep_consistency_7d,
    COUNT(df.sleep_duration) OVER w                         AS days_in_window
FROM daily_features df
WINDOW w AS (
    PARTITION BY df.user_id
    ORDER BY df.date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
);

CREATE OR REPLACE VIEW v_monthly_features AS
SELECT
    df.user_id,
    df.date                                               AS feature_date,
    AVG(df.sleep_duration) OVER m                         AS avg_sleep_30d,
    AVG(df.sleep_efficiency) OVER m                       AS avg_sleep_efficiency_30d,
    AVG(df.avg_hrv) OVER m                                AS avg_hrv_30d,
    AVG(df.resting_hr) OVER m                             AS avg_resting_hr_30d,
    AVG(df.steps) OVER m                                  AS avg_steps_30d,
    AVG(df.exercise_minutes) OVER m                       AS avg_exercise_minutes_30d,
    AVG(df.readiness_score) OVER m                        AS avg_readiness_30d,
    COUNT(df.sleep_duration) OVER m                         AS days_in_window
FROM daily_features df
WINDOW m AS (
    PARTITION BY df.user_id
    ORDER BY df.date
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
);
