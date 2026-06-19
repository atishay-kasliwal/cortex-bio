import { Hono } from 'hono';

import { resolveUser } from '../lib/user.js';
import {
  cortexBatchSchema,
  getTrainingDataset,
  getTrainingDatasetStats,
  ingestCortexDaily,
} from '../services/cortex.js';
import { validatePredictions } from '../services/validation.js';

export const cortex = new Hono()
  .post('/daily', async (c) => {
    const body = cortexBatchSchema.parse(await c.req.json());
    const user = await resolveUser();
    const result = await ingestCortexDaily(user.id, body.records);
    const validation = await validatePredictions(user.id, result.dates);
    return c.json({ ...result, validation });
  })
  .get('/dataset', async (c) => {
    const user = await resolveUser();
    const limit = Math.min(Number(c.req.query('limit') ?? 90), 365);
    const rows = await getTrainingDataset(user.id, limit);
    return c.json({ dataset: rows, count: rows.length });
  })
  .get('/dataset/stats', async (c) => {
    const user = await resolveUser();
    const stats = await getTrainingDatasetStats(user.id);
    return c.json(stats);
  });
