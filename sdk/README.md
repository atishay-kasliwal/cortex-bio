# Cortex Bio SDKs

Official client libraries for the Wearable Intelligence API (`/v1`).

| SDK | Package | Install |
|-----|---------|---------|
| TypeScript | `@cortexbio/sdk` | `npm install @cortexbio/sdk` |
| Python | `cortexbio` | `pip install cortexbio` |

## Quick start

```typescript
import { CortexBio } from '@cortexbio/sdk';
const client = new CortexBio({ apiKey: process.env.CORTEX_BIO_API_KEY! });
await client.readiness.today();
```

```python
from cortexbio import CortexBio
client = CortexBio(api_key="cb_live_...")
client.readiness.today()
```

## Self-hosted

Pass `baseUrl` / `base_url`:

```typescript
new CortexBio({ apiKey: 'cb_test_...', baseUrl: 'http://localhost:8000' })
```

```python
CortexBio(api_key='cb_test_...', base_url='http://localhost:8000')
```
