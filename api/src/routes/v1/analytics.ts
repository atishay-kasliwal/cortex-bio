import { Hono } from 'hono';

import { prisma } from '../../lib/prisma.js';
import {
  computeCorrelations,
  getBiomarkerTrends,
} from '../../services/analytics.js';
import { getAuthUser } from './types.js';

export const insightsV1 = new Hono().get('/', async (c) => {
  const user = getAuthUser(c);
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 50);
  const insights = await prisma.insight.findMany({
    where: { userId: user.id },
    orderBy: [{ validFrom: 'desc' }, { confidence: 'desc' }],
    take: limit,
  });
  return c.json({ api_version: 'v1', insights });
});

export const correlationsV1 = new Hono().get('/', async (c) => {
  const user = getAuthUser(c);
  const correlations = await computeCorrelations(user.id, user.timezone);
  const sufficient = correlations.filter((r) => r.sufficient);
  return c.json({
    api_version: 'v1',
    correlations,
    summary: {
      total_pairs: correlations.length,
      sufficient_pairs: sufficient.length,
      ready_for_insights: sufficient.length >= 3,
    },
  });
});

export const trendsV1 = new Hono().get('/', async (c) => {
  const user = getAuthUser(c);
  const days = Number(c.req.query('days') ?? 30);
  const trends = await getBiomarkerTrends(user.id, days);
  return c.json({ api_version: 'v1', ...trends });
});
