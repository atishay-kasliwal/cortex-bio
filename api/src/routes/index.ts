import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { prisma } from '../lib/prisma.js';
import { resolveUser } from '../lib/user.js';
import { syncPayloadSchema } from '../schemas/sync.js';
import {
  parseChronotypeEstimate,
  updateChronotypeEstimate,
} from '../services/chronotype.js';
import {
  computeFeaturesForDates,
  getBaselines,
  getDailyFeature,
} from '../services/feature-engine.js';
import { ingestHealthData } from '../services/ingest.js';

const sync = new Hono();

sync.post('', async (c) => {
  const body = await c.req.json();
  const payload = syncPayloadSchema.parse(body);

  const user = await resolveUser(payload.email, payload.timezone);
  const timezone = payload.timezone ?? user.timezone;

  const ingestResult = await ingestHealthData(user.id, timezone, payload);

  const featuresComputedFor = await computeFeaturesForDates(
    user.id,
    ingestResult.affectedDates,
    timezone,
  );

  const chronotype = await updateChronotypeEstimate(user.id, timezone);
  const baselines = await getBaselines(user.id);

  return c.json({
    user_id: user.id,
    samples_inserted: ingestResult.samplesInserted,
    samples_skipped: ingestResult.samplesSkipped,
    sleep_sessions_upserted: ingestResult.sleepSessionsUpserted,
    workouts_upserted: ingestResult.workoutsUpserted,
    features_computed_for: featuresComputedFor,
    baselines,
    chronotype,
  });
});

export { sync };

export const features = new Hono()
  .get('/daily/:date', async (c) => {
    const date = c.req.param('date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HTTPException(400, { message: 'date must be YYYY-MM-DD' });
    }

    const user = await resolveUser();
    const feature = await getDailyFeature(user.id, date);
    if (!feature) {
      throw new HTTPException(404, { message: 'No daily features for this date' });
    }

    return c.json({ daily_feature: feature });
  })
  .get('/daily', async (c) => {
    const limit = Math.min(Number(c.req.query('limit') ?? 30), 90);
    const user = await resolveUser();

    const rows = await prisma.dailyFeature.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        date: true,
        sleepDuration: true,
        sleepEfficiency: true,
        avgHrv: true,
        hrvVsBaselinePct: true,
        restingHr: true,
        steps: true,
        exerciseMinutes: true,
        activeCalories: true,
        featureConfidence: true,
        computedAt: true,
      },
    });

    return c.json({ features: rows });
  })
  .post('/compute', async (c) => {
    const start = c.req.query('start');
    const end = c.req.query('end');
    const user = await resolveUser();

    if (!start || !end) {
      throw new HTTPException(400, { message: 'start and end query params required (YYYY-MM-DD)' });
    }

    const dates: string[] = [];
    let cursor = start;
    while (cursor <= end) {
      dates.push(cursor);
      const d = new Date(`${cursor}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      cursor = d.toISOString().slice(0, 10);
    }

    const computed = await computeFeaturesForDates(user.id, dates, user.timezone);
    const chronotype = await updateChronotypeEstimate(user.id, user.timezone);

    return c.json({ computed, chronotype });
  });

export const baselines = new Hono().get('', async (c) => {
  const user = await resolveUser();
  const row = await getBaselines(user.id);
  const chronotype = parseChronotypeEstimate(user.chronotypeEstimate);

  return c.json({
    user_id: user.id,
    timezone: user.timezone,
    baselines: row,
    chronotype,
  });
});

export { labels } from './labels.js';
export { sessions } from './sessions.js';
export { analytics } from './analytics.js';
export { readiness } from './readiness.js';
export { windows } from './windows.js';
export { cortex } from './cortex.js';
export { predictions, ml } from './predictions.js';
export { forecast } from './forecast.js';
export { validation } from './validation.js';
export { keys } from './keys.js';
export { authRoutes as auth } from './auth.js';
export { profile } from './profile.js';
export { providers } from './providers.js';
export { meta } from './meta.js';
export { v1 } from './v1/index.js';
export { docs } from './docs.js';
export { admin } from './admin.js';
