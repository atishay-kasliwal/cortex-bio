import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { prisma } from '../lib/prisma.js';
import { resolveUser } from '../lib/user.js';
import { getTomorrowPrediction, trainModels } from '../services/ml.js';

export const predictions = new Hono()
  .get('/tomorrow', async (c) => {
    const user = await resolveUser();
    const result = await getTomorrowPrediction(user.id, user.timezone);

    if (!result) {
      throw new HTTPException(404, {
        message:
          'No model available. Import Cortex data via POST /api/cortex/daily and run POST /api/ml/train.',
      });
    }

    return c.json(result);
  })
  .get('/history', async (c) => {
    const user = await resolveUser();
    const limit = Math.min(Number(c.req.query('limit') ?? 30), 90);

    const rows = await prisma.performancePrediction.findMany({
      where: { userId: user.id },
      orderBy: { predictionDate: 'desc' },
      take: limit,
    });

    return c.json({ predictions: rows });
  });

export const ml = new Hono()
  .post('/train', async (c) => {
    const user = await resolveUser();

    try {
      const result = await trainModels(user.id);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Training failed';
      throw new HTTPException(400, { message });
    }
  })
  .get('/runs', async (c) => {
    const user = await resolveUser();
    const runs = await prisma.modelRun.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return c.json({ runs });
  });
