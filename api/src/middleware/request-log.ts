import { createMiddleware } from 'hono/factory';

import { prisma } from '../lib/prisma.js';
import type { AppEnv } from './auth.js';

export const requestLog = createMiddleware<AppEnv>(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const endpoint = c.req.path;

  try {
    await next();
  } finally {
    const latencyMs = Date.now() - start;
    const status = c.res.status;
    const apiKey = c.get('apiKey');
    const authUser = c.get('authUser');

    prisma.apiRequest
      .create({
        data: {
          apiKeyId: apiKey?.id ?? null,
          userId: authUser?.id ?? null,
          method,
          endpoint,
          status,
          latencyMs,
        },
      })
      .catch(() => {
        // non-blocking
      });
  }
});
