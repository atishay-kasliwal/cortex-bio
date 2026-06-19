import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { resolveUser } from '../lib/user.js';
import { computeReadiness, getTodayReadiness } from '../services/readiness.js';

export const readiness = new Hono()
  .get('/today', async (c) => {
    const user = await resolveUser();
    const result = await getTodayReadiness(user.id, user.timezone);
    if (!result) {
      throw new HTTPException(404, {
        message: 'No features for today. Sync HealthKit data first.',
      });
    }
    return c.json(result);
  })
  .get('/:date', async (c) => {
    const date = c.req.param('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HTTPException(400, { message: 'date must be YYYY-MM-DD' });
    }
    const user = await resolveUser();
    const result = await computeReadiness(user.id, date);
    if (!result) {
      throw new HTTPException(404, { message: 'No features for this date' });
    }
    return c.json(result);
  });
