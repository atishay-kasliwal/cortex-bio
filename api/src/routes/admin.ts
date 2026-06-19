import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { config } from '../config.js';
import { getAdoptionMetrics } from '../services/admin-metrics.js';

function assertAdmin(c: { req: { header: (n: string) => string | undefined } }) {
  if (!config.ADMIN_SECRET) {
    throw new HTTPException(503, { message: 'Admin metrics not configured' });
  }
  const token =
    c.req.header('X-Admin-Token') ??
    c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (token !== config.ADMIN_SECRET) {
    throw new HTTPException(401, { message: 'Invalid admin token' });
  }
}

export const admin = new Hono()
  .get('/metrics', async (c) => {
    assertAdmin(c);
    const days = Math.min(Number(c.req.query('days') ?? 30), 90);
    return c.json(await getAdoptionMetrics(days));
  });
