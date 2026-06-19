## Summary

<!-- What does this PR change and why? -->

## Type

- [ ] Bug fix
- [ ] Feature (OSS engine layer)
- [ ] Documentation
- [ ] SDK
- [ ] Chore / refactor

## Test plan

<!-- How did you verify this works? -->

```bash
# e.g.
cd api && npm run dev
curl http://localhost:8000/v1/readiness/today -H "Authorization: Bearer ..."
```

## Checklist

- [ ] Runs locally against seeded data
- [ ] No secrets or `.env` files committed
- [ ] Database changes include a Prisma migration (if applicable)
- [ ] README or `docs/` updated (if behavior changed)
- [ ] Stays within the open-source boundary ([docs/OPEN_SOURCE.md](../docs/OPEN_SOURCE.md))
