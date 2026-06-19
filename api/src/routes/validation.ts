import { Hono } from 'hono';

import { resolveUser } from '../lib/user.js';
import {
  getValidationFeatures,
  getValidationHistory,
  getValidationSummary,
  TARGET_TYPES,
  validatePredictions,
  type TargetType,
} from '../services/validation.js';

export const validation = new Hono()
  .get('/summary', async (c) => {
    const user = await resolveUser();
    return c.json(await getValidationSummary(user.id));
  })
  .get('/history', async (c) => {
    const user = await resolveUser();
    const target = c.req.query('target') as TargetType | undefined;
    const limit = Number(c.req.query('limit') ?? 90);

    if (target && !TARGET_TYPES.includes(target)) {
      return c.json({ error: `target must be one of: ${TARGET_TYPES.join(', ')}` }, 400);
    }

    return c.json(await getValidationHistory(user.id, { target, limit }));
  })
  .get('/features', async (c) => {
    const user = await resolveUser();
    return c.json(await getValidationFeatures(user.id));
  })
  .post('/compute', async (c) => {
    const user = await resolveUser();
    const result = await validatePredictions(user.id);
    return c.json(result);
  });
