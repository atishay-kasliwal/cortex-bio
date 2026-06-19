# Open Source vs Proprietary

Cortex Bio is split into two layers so researchers and developers can build on the engine without depending on commercial integrations.

## Open Source Layer

**The wearable intelligence engine.**

Available under [MIT](../LICENSE) in this repository.

| Component | Location | Description |
|-----------|----------|-------------|
| HealthKit ingest | `api/src/services/ingest.ts` | Append-only raw sample pipeline |
| Feature engine | `api/src/services/feature-engine.ts` | Daily / hourly biomarker rollups |
| Chronotype | `api/src/services/chronotype.ts` | Wake-time classification |
| Rules readiness | `api/src/services/readiness.ts` | Explainable readiness scoring |
| Cognitive windows | `api/src/services/cognitive-windows.ts` | Peak / crash window discovery |
| Analytics | `api/src/services/analytics.ts` | Correlations and personal insights |
| Forecast (rules) | `api/src/services/forecast.ts` | 24-hour performance curves |
| Database schema | `db/prisma/` | PostgreSQL feature store |
| Reference iOS app | `ios/` | SwiftUI + HealthKit sync |
| ML scaffolding | `ml/` | XGBoost training + evaluation scripts |

**You can run the full open-source stack without any proprietary services.**

Ground truth in the OSS layer uses self-reported labels and work session quality — useful for research, not production performance scoring.

## Proprietary Layer

**Atriveo Cortex integration, scoring models, production datasets, and commercial APIs.**

Not included in this repository. Access via [Atriveo](https://atriveo.com) (commercial).

| Component | Description |
|-----------|-------------|
| Cortex telemetry ingest | Deep work, attention, context switching, coding/writing/research activity |
| Production scoring models | Models trained on proprietary Cortex datasets |
| `cortex_daily_metrics` population | Real knowledge-work performance ground truth |
| Performance predictions | ML targets tied to actual work output |
| Validation against Cortex | Proof that biometrics predict real performance |
| Hosted Wearable Intelligence API | `GET /v1/...` platform on Neon (coming) |

Routes in the reference API that touch proprietary data are marked in [API reference](./API.md#proprietary-endpoints).

## Why split?

1. **Research** — Publish methods, schema, and baselines without leaking commercial datasets.
2. **Trust** — Explainable rules and feature store are auditable; black-box models stay optional.
3. **Ecosystem** — Anyone can build apps on readiness, windows, and chronotype APIs.
4. **Business** — Cortex integration and hosted APIs remain the commercial moat.

## Contributing

OSS contributions should target the engine layer. Proprietary Cortex schemas in `db/prisma` exist as integration stubs for self-hosters who bring their own telemetry — do not commit production datasets or API keys.

See [CONTRIBUTING.md](../CONTRIBUTING.md).
