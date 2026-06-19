# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `v1` API  | ✅ Active |
| `main`    | ✅ Active |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **security@atriveo.com** with:

- Description of the issue
- Steps to reproduce
- Impact assessment (if known)
- Your contact information

We aim to acknowledge reports within **48 hours** and provide a fix timeline within **7 days** for confirmed issues.

## Scope

In scope:

- `/v1` API authentication and authorization
- API key handling and storage
- SQL injection / data exposure via API
- Health data leakage between users

Out of scope:

- Self-hosted deployments without TLS (use HTTPS in production)
- Compromised API keys shared by users
- Third-party wearable provider OAuth (when added)

## API keys

- Rotate keys immediately if exposed
- Use `cb_test_*` keys only in development
- Set a strong `API_KEY_PEPPER` in production

```bash
DELETE /api/keys/:id   # revoke a compromised key
```
