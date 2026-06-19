#!/usr/bin/env tsx
import 'dotenv/config';

import { createApiKey } from '../src/lib/api-keys.js';
import { resolveUser } from '../src/lib/user.js';

const name = process.argv[2] ?? 'cli-key';
const tier = (process.argv[3] as 'free' | 'pro' | 'enterprise') ?? 'free';

const user = await resolveUser();
const result = await createApiKey(user.id, name, tier);

console.log(JSON.stringify({ message: 'Store securely — shown once', ...result }, null, 2));
