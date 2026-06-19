import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { resolveUser } from '../lib/user.js';
import { dailyLabelSchema } from '../schemas/labels.js';
import {
  getDailyLabel,
  getLabelProgress,
  listDailyLabels,
  upsertDailyLabel,
} from '../services/labels.js';

export const labels = new Hono()
  .get('/progress', async (c) => {
    const user = await resolveUser();
    const progress = await getLabelProgress(user.id);
    return c.json(progress);
  })
  .get('/:date', async (c) => {
    const date = c.req.param('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HTTPException(400, { message: 'date must be YYYY-MM-DD' });
    }

    const user = await resolveUser();
    const label = await getDailyLabel(user.id, date);
    if (!label) {
      throw new HTTPException(404, { message: 'No label for this date' });
    }
    return c.json({ label });
  })
  .get('/', async (c) => {
    const user = await resolveUser();
    const from = c.req.query('from');
    const to = c.req.query('to');
    const limit = Math.min(Number(c.req.query('limit') ?? 30), 90);
    const rows = await listDailyLabels(user.id, from, to, limit);
    return c.json({ labels: rows });
  })
  .put('/:date', async (c) => {
    const date = c.req.param('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HTTPException(400, { message: 'date must be YYYY-MM-DD' });
    }

    const body = dailyLabelSchema.parse(await c.req.json());
    const user = await resolveUser();
    const label = await upsertDailyLabel(user.id, date, body);
    return c.json({ label });
  });
