import { Hono } from 'hono';

import { requireFeature } from '../../middleware/feature-gate.js';
import { prisma } from '../../lib/prisma.js';
import {
  getCognitiveWindows,
} from '../../services/cognitive-windows.js';
import { getTodayForecast } from '../../services/forecast.js';
import { getAuthUser } from './types.js';

export const windowsV1 = new Hono()
  .get('/today', async (c) => {
    const user = getAuthUser(c);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: user.timezone });
    const result = await getCognitiveWindows(user.id, today, user.timezone);
    return c.json({ api_version: 'v1', ...result });
  })
  .get('/week', async (c) => {
    const user = getAuthUser(c);
    const rows = await prisma.cognitiveWindow.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 7,
      select: {
        date: true,
        peakWindowStart: true,
        peakWindowEnd: true,
        secondaryWindowStart: true,
        secondaryWindowEnd: true,
        crashWindowStart: true,
        crashWindowEnd: true,
        hourlyCurve: true,
        confidence: true,
        version: true,
      },
    });

    return c.json({
      api_version: 'v1',
      windows: rows.reverse().map((w) => ({
        date: w.date.toISOString().slice(0, 10),
        peak_window: w.peakWindowStart && w.peakWindowEnd
          ? { start: w.peakWindowStart.toISOString(), end: w.peakWindowEnd.toISOString() }
          : null,
        secondary_window: w.secondaryWindowStart && w.secondaryWindowEnd
          ? { start: w.secondaryWindowStart.toISOString(), end: w.secondaryWindowEnd.toISOString() }
          : null,
        crash_window: w.crashWindowStart && w.crashWindowEnd
          ? { start: w.crashWindowStart.toISOString(), end: w.crashWindowEnd.toISOString() }
          : null,
        hourly_curve: w.hourlyCurve,
        confidence: w.confidence,
        version: w.version,
      })),
    });
  });

export const forecastV1 = new Hono();
forecastV1.use('*', requireFeature('forecasting'));
forecastV1.get('/', async (c) => {
  const user = getAuthUser(c);
  const result = await getTodayForecast(user.id, user.timezone);
  return c.json({ api_version: 'v1', ...result });
});
