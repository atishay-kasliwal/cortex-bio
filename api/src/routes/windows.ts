import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { prisma } from '../lib/prisma.js';
import { resolveUser } from '../lib/user.js';
import {
  computeCognitiveWindows,
  getCognitiveWindows,
} from '../services/cognitive-windows.js';

export const windows = new Hono()
  .get('/today', async (c) => {
    const user = await resolveUser();
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: user.timezone,
    });
    const result = await getCognitiveWindows(user.id, today, user.timezone);
    return c.json(result);
  })
  .post('/compute/:date', async (c) => {
    const date = c.req.param('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HTTPException(400, { message: 'date must be YYYY-MM-DD' });
    }
    const user = await resolveUser();
    const result = await computeCognitiveWindows(user.id, date, user.timezone);
    return c.json(result);
  })
  .get('/history', async (c) => {
    const user = await resolveUser();
    const limit = Math.min(Number(c.req.query('limit') ?? 30), 90);

    const rows = await prisma.cognitiveWindow.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        date: true,
        peakWindowStart: true,
        peakWindowEnd: true,
        secondaryWindowStart: true,
        secondaryWindowEnd: true,
        crashWindowStart: true,
        crashWindowEnd: true,
        meetingWindowStart: true,
        meetingWindowEnd: true,
        recoveryWindowStart: true,
        recoveryWindowEnd: true,
        hourlyCurve: true,
        confidence: true,
        version: true,
      },
    });

    return c.json({ windows: rows });
  })
  .get('/:date', async (c) => {
    const date = c.req.param('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HTTPException(400, { message: 'date must be YYYY-MM-DD' });
    }
    const user = await resolveUser();
    const result = await getCognitiveWindows(user.id, date, user.timezone);
    return c.json(result);
  });
