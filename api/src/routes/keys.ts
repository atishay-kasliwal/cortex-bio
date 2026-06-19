import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKeyTier,
} from '../lib/api-keys.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AppEnv } from '../middleware/auth.js';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  tier: z.enum(['free', 'pro', 'enterprise']).optional().default('free'),
});

export const keys = new Hono<AppEnv>();

keys.use('*', requireAuth);

keys.post('', async (c) => {
  const body = createKeySchema.parse(await c.req.json());
  const user = c.get('authUser');
  const result = await createApiKey(user.id, body.name, body.tier as ApiKeyTier);

  return c.json(
    {
      message: 'Store this key securely — it will not be shown again.',
      key: result.key,
      id: result.id,
      prefix: result.prefix,
      tier: result.tier,
      rate_limit: result.rate_limit,
    },
    201,
  );
})
  .get('', async (c) => {
    const user = c.get('authUser');
    const rows = await listApiKeys(user.id);

    const usageByKey = await prisma.apiRequest.groupBy({
      by: ['apiKeyId'],
      where: {
        userId: user.id,
        apiKeyId: { in: rows.map((r) => r.id) },
      },
      _count: { id: true },
    });
    const usageMap = new Map(
      usageByKey.map((u) => [u.apiKeyId, u._count.id]),
    );

    return c.json({
      keys: rows.map((row) => ({
        id: row.id,
        name: row.name,
        prefix: row.keyPrefix,
        tier: row.tier,
        rate_limit: row.rateLimit,
        created_at: row.createdAt.toISOString(),
        last_used_at: row.lastUsedAt?.toISOString() ?? null,
        requests: usageMap.get(row.id) ?? 0,
      })),
    });
  })
  .get('/usage', async (c) => {
    const user = c.get('authUser');
    const days = Math.min(Number(c.req.query('days') ?? 7), 90);
    const since = new Date(Date.now() - days * 86_400_000);

    const [byEndpoint, byDay, total, recent] = await Promise.all([
      prisma.apiRequest.groupBy({
        by: ['endpoint', 'status'],
        where: { userId: user.id, createdAt: { gte: since } },
        _count: { id: true },
        _avg: { latencyMs: true },
      }),
      prisma.apiRequest.findMany({
        where: { userId: user.id, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.apiRequest.count({
        where: { userId: user.id, createdAt: { gte: since } },
      }),
      prisma.apiRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          method: true,
          endpoint: true,
          status: true,
          latencyMs: true,
          createdAt: true,
          apiKeyId: true,
        },
      }),
    ]);

    const dayBuckets = new Map<string, number>();
    for (const row of byDay) {
      const key = row.createdAt.toISOString().slice(0, 10);
      dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
    }

    const latencies = byEndpoint
      .map((r) => r._avg.latencyMs)
      .filter((v): v is number => v != null);
    const avgLatency =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : null;

    const errors = byEndpoint
      .filter((r) => r.status >= 400)
      .reduce((sum, r) => sum + r._count.id, 0);
    const errorRate = total > 0 ? (errors / total) * 100 : 0;

    const countEndpoint = (needle: string) =>
      byEndpoint
        .filter((r) => r.endpoint.includes(needle))
        .reduce((sum, r) => sum + r._count.id, 0);

    const activeKeys = await prisma.apiKey.count({
      where: { userId: user.id, revokedAt: null },
    });

    return c.json({
      days,
      total_requests: total,
      forecast_calls: countEndpoint('/forecast'),
      readiness_calls: countEndpoint('/readiness'),
      active_keys: activeKeys,
      avg_latency_ms: avgLatency,
      error_rate_pct: Math.round(errorRate * 100) / 100,
      requests_by_day: [...dayBuckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      by_endpoint: byEndpoint.map((row) => ({
        endpoint: row.endpoint,
        status: row.status,
        count: row._count.id,
        avg_latency_ms: row._avg.latencyMs
          ? Math.round(row._avg.latencyMs)
          : null,
      })),
      recent_requests: recent.map((r) => ({
        id: r.id,
        method: r.method,
        endpoint: r.endpoint,
        status: r.status,
        latency_ms: r.latencyMs,
        created_at: r.createdAt.toISOString(),
        api_key_id: r.apiKeyId,
      })),
    });
  })
  .delete('/:id', async (c) => {
    const user = c.get('authUser');
    const revoked = await revokeApiKey(user.id, c.req.param('id'));
    if (!revoked) {
      throw new HTTPException(404, { message: 'API key not found' });
    }
    return c.json({ revoked: true });
  });
