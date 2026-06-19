import { Hono } from 'hono';

import { prisma } from '../lib/prisma.js';
import { resolveUser } from '../lib/user.js';
import {
  computeCorrelations,
  generateInsights,
  persistInsights,
} from '../services/analytics.js';

export const analytics = new Hono()
  .get('/correlations', async (c) => {
    const user = await resolveUser();
    const correlations = await computeCorrelations(user.id, user.timezone);
    const sufficient = correlations.filter((r) => r.sufficient);

    return c.json({
      correlations,
      summary: {
        total_pairs: correlations.length,
        sufficient_pairs: sufficient.length,
        ready_for_insights: sufficient.length >= 3,
      },
    });
  })
  .get('/insights', async (c) => {
    const user = await resolveUser();
    const limit = Math.min(Number(c.req.query('limit') ?? 20), 50);

    const insights = await prisma.insight.findMany({
      where: { userId: user.id },
      orderBy: [{ validFrom: 'desc' }, { confidence: 'desc' }],
      take: limit,
    });

    return c.json({ insights });
  })
  .post('/insights/generate', async (c) => {
    const user = await resolveUser();
    const generated = await generateInsights(user.id, user.timezone);
    const count = await persistInsights(user.id, generated);

    return c.json({
      generated: count,
      insights: generated,
    });
  });
