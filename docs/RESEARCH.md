# Research References

Cortex Bio connects consumer wearable biomarkers to cognitive performance hypotheses. This document cites foundational work and design choices.

## Autonomic nervous system and cognition

**Heart rate variability (HRV)** reflects parasympathetic activity. Lower stress and better recovery correlate with higher time-domain HRV (RMSSD).

- Thayer, J. F., Hansen, A. L., Saus-Rose, E., & Johnsen, B. H. (2009). Heart rate variability, prefrontal neural function, and cognitive performance: The neurovisceral integration perspective on self-regulation, adaptation, and health. *Annals of Behavioral Medicine*.
- Shaffer, F., & Ginsberg, J. P. (2017). An overview of heart rate variability metrics and norms. *Frontiers in Public Health*.

**Cortex Bio use:** `avg_hrv`, `hrv_vs_baseline_pct` in `daily_features`; readiness contributor when HRV exceeds personal baseline.

## Sleep and next-day cognition

Sleep duration and efficiency predict executive function, attention, and reaction time on the following day.

- Walker, M. (2017). *Why We Sleep*. Scribner.
- Lim, J., & Dinges, D. F. (2010). A meta-analysis of the impact of short sleep on cognitive function. *Sleep*.

**Cortex Bio use:** Primary sleep session per night; `sleep_duration`, `sleep_efficiency`, `sleep_debt_hours` in daily rollups.

## Chronotype and circadian performance

Individual differences in circadian phase (morningness-eveningness) shift peak cognitive windows.

- Horne, J. A., & Östberg, O. (1976). A self-assessment questionnaire to determine morningness-eveningness in human circadian rhythms. *International Journal of Chronobiology*.
- Roenneberg, T., et al. (2007). Epidemiology of the human circadian clock. *Sleep Medicine Reviews*.

**Cortex Bio use:** Data-driven chronotype from wake-time distribution (`chronotype.ts`); priors on hourly cognitive curves.

## Ultradian rhythms

~90-minute rest-activity cycles may modulate sustained attention within the day.

- Kleitman, N. (1982). Basic rest-activity cycle—22 years later. *Sleep*.
- Lavie, P. (1986). Ultrashort sleep-waking schedule. *Clinics in Chest Medicine*.

**Cortex Bio use:** Hourly `activity_score` and session-quality weighting in cognitive window discovery.

## Training load and recovery

Fitness-fatigue models relate acute training load to performance capacity.

- Banister, E. W., Calvert, T. W., Savage, M. V., & Bach, T. (1975). A systems model of training for athletic performance. *Australian Journal of Sports Medicine*.

**Cortex Bio use:** `exercise_minutes`, `active_calories`, steps as load signals in readiness rules.

## Wearables in research

Consumer wearables show acceptable agreement with research-grade devices for sleep and HR trends at population scale, with individual calibration recommended.

- Miller, D. J., et al. (2022). A validation of Apple Watch sleep tracking. *Sleep Advances*.
- HRV validation studies across Apple Watch, Oura, WHOOP (device-specific; see device whitepapers).

**Cortex Bio use:** Apple Watch as primary ingest; schema designed for multi-device normalization (Phase 11).

## Machine learning for performance prediction

Gradient-boosted trees (XGBoost) provide strong tabular baselines with interpretable feature importance — preferred over deep learning for small N and explainability requirements.

- Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *KDD*.

**Cortex Bio use:** `ml/train.py`; models gated by comparison to naive baselines (yesterday, rolling mean, rules readiness).

## Ground truth for knowledge work

Self-reported productivity correlates weakly with objective output. Cortex Bio OSS uses labels and session quality for research; production validation targets proprietary Cortex telemetry (attention, deep work minutes, output quality).

**Design implication:** Phase 9 validation proves model value only when paired with objective ground truth.

---

## Reproducibility

Researchers can reproduce feature computation from:

1. `db/prisma/seed.ts` — 90 days synthetic longitudinal data
2. `db/sql/example-queries.sql` — baseline and rollup queries
3. `api/src/services/feature-engine.ts` — authoritative rollup logic

Cite this repository and document your schema version (`prisma/migrations`).

---

## Suggested reading order

1. Feature store design — [ARCHITECTURE.md](../ARCHITECTURE.md)
2. Readiness rules — `api/src/services/readiness.ts`
3. Window discovery — `api/src/services/cognitive-windows.ts`
4. ML validation — `api/src/services/validation.ts`
