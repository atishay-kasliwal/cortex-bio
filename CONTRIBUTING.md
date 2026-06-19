# Contributing to Cortex Bio

Thank you for helping build the open-source wearable intelligence engine.

## What we're building

Cortex Bio is **research infrastructure for cognitive performance from wearable signals** — not a productivity app. Contributions should strengthen the feature store, explainability, chronotype methods, validation, and developer experience.

## What to contribute (OSS layer)

| Area | Examples |
|------|----------|
| Feature engineering | New biomarker rollups, sleep staging, recovery indices |
| Wearable adapters | Oura, WHOOP, Garmin normalizers → `health_samples` |
| Chronotype | Alternative classification methods, confidence scoring |
| Readiness | Rules tuning with cited rationale, contributor transparency |
| Cognitive windows | Window detection algorithms, hourly curve models |
| Analytics | Statistical methods, insight generation |
| ML | Training scripts, evaluation, feature importance |
| Tests | Service unit tests, API integration tests |
| Docs | Architecture, API reference, research notes |
| iOS | HealthKit coverage, UI for readiness/windows |

## Out of scope

- Proprietary Cortex telemetry or production datasets
- API keys, credentials, or `.env` files
- Black-box LLM/transformer models (project uses XGBoost + rules by design)
- Marketing positioning as a "productivity" or "focus" app

## Getting started

```bash
git clone https://github.com/atriveo/cortex-bio.git
cd cortex-bio

cd db && npm install && cp .env.example .env
# Set DATABASE_URL
npm run db:migrate && npm run db:generate && npm run db:seed

cd ../api && npm install && cp .env.example .env
npm run dev
```

Verify:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/readiness/today
```

## Development workflow

1. **Fork** the repository
2. **Branch** from `main`: `feat/chronotype-confidence`, `fix/sleep-double-count`, etc.
3. **Change** the smallest surface that solves the problem
4. **Test** locally against seeded data
5. **Document** API or schema changes in `docs/` or `api/README.md`
6. **Open a PR** with a clear description and test plan

## Code style

- **TypeScript (API):** Match existing Hono + Prisma patterns; no over-abstraction
- **Swift (iOS):** SwiftUI, async/await, match existing service/view structure
- **Python (ML):** Type hints, keep dependencies in `ml/requirements.txt`
- **SQL:** Migrations via Prisma; raw SQL only in `db/sql/` or migration files

## Database changes

1. Edit `db/prisma/schema.prisma`
2. Create migration: `cd db && npx prisma migrate dev --name your_change`
3. Update seed if needed: `db/prisma/seed.ts`
4. Document breaking changes in PR description

## Commit messages

Use imperative mood, concise subject:

```text
Add Oura sleep session normalizer
Fix HRV baseline when sample count < 7
Document v1 API readiness endpoints
```

## Pull request checklist

- [ ] Runs locally (`npm run dev`, migrations apply)
- [ ] No secrets committed
- [ ] Schema changes include migration
- [ ] README or `docs/` updated if behavior changes
- [ ] OSS/proprietary boundary respected

## Community

- **Bug reports:** GitHub Issues with reproduction steps
- **Feature ideas:** GitHub Discussions
- **Security:** Email security@atriveo.com (do not open public issues for vulnerabilities)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
