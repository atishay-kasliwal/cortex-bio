import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import { authenticateRequest } from '../lib/auth/resolve.js';
import type { ApiKeyTier } from '../lib/api-keys.js';
import type { AuthContext } from '../lib/auth/types.js';

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(bucketKey: string, limit: number): void {
  const now = Date.now();
  const windowMs = 60_000;
  const bucket = rateBuckets.get(bucketKey);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new HTTPException(429, {
      message: `Rate limit exceeded (${limit} requests/minute)`,
    });
  }

  bucket.count += 1;
}

export type AppEnv = {
  Variables: {
    authUser: AuthContext['user'];
    authContext: AuthContext;
    apiKey?: AuthContext['apiKey'];
    authMethod: 'api_key' | 'jwt';
  };
};

async function applyAuth(c: Parameters<Parameters<typeof createMiddleware<AppEnv>>[0]>[0]) {
  const auth = await authenticateRequest(c.req.header('Authorization'));
  if (!auth) {
    throw new HTTPException(401, {
      message:
        'Unauthorized. Use Authorization: Bearer <supabase_jwt> or cb_live_/cb_test_ API key.',
    });
  }

  const rateKey = auth.apiKey?.id ?? `jwt:${auth.user.id}`;
  const rateLimit = auth.apiKey?.rateLimit ?? 120;
  checkRateLimit(rateKey, rateLimit);

  c.set('authUser', auth.user);
  c.set('authContext', auth);
  c.set('authMethod', auth.method);
  if (auth.apiKey) c.set('apiKey', auth.apiKey);
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  await applyAuth(c);
  await next();
});

export const v1Auth = createMiddleware<AppEnv>(async (c, next) => {
  await applyAuth(c);
  await next();
});

export function getAuthUser(c: { get: (k: 'authUser') => AppEnv['Variables']['authUser'] }) {
  return c.get('authUser');
}

export function getApiKey(
  c: { get: (k: 'apiKey') => AppEnv['Variables']['apiKey'] | undefined },
): { id: string; tier: ApiKeyTier; rateLimit: number; name: string } | undefined {
  return c.get('apiKey');
}
