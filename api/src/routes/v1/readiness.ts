import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { prisma } from '../../lib/prisma.js';
import { getBaselines } from '../../services/feature-engine.js';
import {
  computeReadiness,
  getReadinessHistory,
  getTodayReadiness,
} from '../../services/readiness.js';
import { parseChronotypeEstimate } from '../../services/chronotype.js';
import { getAuthUser } from './types.js';

export const readinessV1 = new Hono()
  .get('/today', async (c) => {
    const user = getAuthUser(c);
    const result = await getTodayReadiness(user.id, user.timezone);
    if (!result) {
      throw new HTTPException(404, {
        message: 'No features for today. Sync wearable data first.',
      });
    }
    return c.json({ api_version: 'v1', ...result });
  })
  .get('/history', async (c) => {
    const user = getAuthUser(c);
    const days = Number(c.req.query('days') ?? 30);
    const history = await getReadinessHistory(user.id, user.timezone, days);
    return c.json({ api_version: 'v1', history });
  })
  .get('/:date', async (c) => {
    const date = c.req.param('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HTTPException(400, { message: 'date must be YYYY-MM-DD' });
    }
    const user = getAuthUser(c);
    const result = await computeReadiness(user.id, date);
    if (!result) {
      throw new HTTPException(404, { message: 'No features for this date' });
    }
    return c.json({ api_version: 'v1', ...result });
  });

export const baselinesV1 = new Hono().get('', async (c) => {
  const user = getAuthUser(c);
  const row = await getBaselines(user.id);
  const chronotype = parseChronotypeEstimate(
    (await prisma.user.findUnique({ where: { id: user.id } }))?.chronotypeEstimate ?? null,
  );
  return c.json({
    api_version: 'v1',
    user_id: user.id,
    timezone: user.timezone,
    baselines: row,
    chronotype,
  });
});

export const chronotypeV1 = new Hono().get('', async (c) => {
  const user = getAuthUser(c);
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const chronotype = parseChronotypeEstimate(dbUser?.chronotypeEstimate ?? null);
  if (!chronotype) {
    throw new HTTPException(404, {
      message: 'Chronotype not computed. Sync sleep data first.',
    });
  }
  return c.json({ api_version: 'v1', chronotype });
});
