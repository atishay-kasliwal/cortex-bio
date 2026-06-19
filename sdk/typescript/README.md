# @cortexbio/sdk

TypeScript SDK for the [Cortex Bio](https://github.com/atriveo/cortex-bio) Wearable Intelligence API.

## Install

```bash
npm install @cortexbio/sdk
```

## Usage

```typescript
import { CortexBio } from '@cortexbio/sdk';

const client = new CortexBio({
  apiKey: process.env.CORTEX_BIO_API_KEY!,
  // baseUrl: 'http://localhost:8000', // self-hosted
});

const readiness = await client.readiness.today();
console.log(readiness.readiness_score);

const forecast = await client.forecast.today();
const chronotype = await client.chronotype.get();
```

## API surface

| Namespace | Methods |
|-----------|---------|
| `readiness` | `today()`, `history(days?)`, `baselines()` |
| `chronotype` | `get()` |
| `windows` | `today()`, `week()` |
| `forecast` | `today()` |
| `analytics` | `insights()`, `correlations()`, `trends()` |
| `predictions` | `tomorrow()`, `week()` |
| `models` | `status()` |
