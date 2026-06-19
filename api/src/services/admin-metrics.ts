import { prisma } from '../lib/prisma.js';

export async function getAdoptionMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);

  const [
    totalKeys,
    activeKeys,
    requestsInPeriod,
    requestsByEndpoint,
    requestsByDay,
    keysCreatedByDay,
  ] = await Promise.all([
    prisma.apiKey.count({ where: { revokedAt: null } }),
    prisma.apiKey.count({
      where: {
        revokedAt: null,
        lastUsedAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
      },
    }),
    prisma.apiRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.apiRequest.groupBy({
      by: ['endpoint'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.$queryRaw<
      Array<{ day: Date; count: bigint }>
    >`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM api_requests
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<
      Array<{ day: Date; count: bigint }>
    >`
      SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
      FROM api_keys
      WHERE created_at >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  const sortedEndpoints = [...requestsByEndpoint].sort(
    (a, b) => b._count.id - a._count.id,
  );

  const endpointMap = Object.fromEntries(
    sortedEndpoints.map((r) => [r.endpoint, r._count.id]),
  );

  const readinessCalls =
    (endpointMap['/v1/readiness/today'] ?? 0) +
    (endpointMap['/v1/readiness/history'] ?? 0);
  const forecastCalls = endpointMap['/v1/forecast'] ?? 0;
  const windowsCalls =
    (endpointMap['/v1/windows/today'] ?? 0) +
    (endpointMap['/v1/windows/week'] ?? 0);
  const chronotypeCalls = endpointMap['/v1/chronotype'] ?? 0;
  const predictionCalls =
    (endpointMap['/v1/predictions/tomorrow'] ?? 0) +
    (endpointMap['/v1/predictions/week'] ?? 0);

  return {
    period_days: days,
    api_keys: {
      total: totalKeys,
      active_last_7d: activeKeys,
    },
    requests: {
      total: requestsInPeriod,
      per_day_avg:
        days > 0 ? Math.round((requestsInPeriod / days) * 10) / 10 : 0,
      by_day: requestsByDay.map((r) => ({
        date: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
      })),
    },
    product_signals: {
      readiness_calls: readinessCalls,
      forecast_calls: forecastCalls,
      windows_calls: windowsCalls,
      chronotype_calls: chronotypeCalls,
      prediction_calls: predictionCalls,
      top_endpoints: sortedEndpoints.slice(0, 10).map((r) => ({
        endpoint: r.endpoint,
        count: r._count.id,
      })),
    },
    keys_created_by_day: keysCreatedByDay.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    })),
    sdk_downloads: {
      npm: 'Track via npmjs.com/package/@cortexbio/sdk',
      pypi: 'Track via pypi.org/project/cortexbio',
    },
  };
}
