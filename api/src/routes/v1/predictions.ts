import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { DateTime } from 'luxon';

import { requireFeature } from '../../middleware/feature-gate.js';
import { prisma } from '../../lib/prisma.js';
import { getTomorrowPrediction } from '../../services/ml.js';
import { getValidationSummary } from '../../services/validation.js';
import { getAuthUser } from './types.js';

export const predictionsV1 = new Hono();
predictionsV1.use('*', requireFeature('ml'));

export const modelsV1 = new Hono();
modelsV1.use('*', requireFeature('ml'));

predictionsV1
  .get('/tomorrow', async (c) => {
    const user = getAuthUser(c);
    const result = await getTomorrowPrediction(user.id, user.timezone);
    if (!result) {
      throw new HTTPException(404, {
        message: 'No model available. Train a model or import Cortex telemetry.',
      });
    }
    return c.json({ api_version: 'v1', ...result });
  })
  .get('/week', async (c) => {
    const user = getAuthUser(c);
    const tomorrow = await getTomorrowPrediction(user.id, user.timezone);

    const history = await prisma.performancePrediction.findMany({
      where: { userId: user.id },
      orderBy: { predictionDate: 'desc' },
      take: 6,
    });

    const upcoming = tomorrow
      ? [
          {
            date: DateTime.now()
              .setZone(user.timezone)
              .plus({ days: 1 })
              .toISODate(),
            ...tomorrow,
          },
        ]
      : [];

    return c.json({
      api_version: 'v1',
      upcoming,
      recent: history.map((p) => ({
        date: p.predictionDate.toISOString().slice(0, 10),
        predicted_attention: p.predictedAttention,
        predicted_deep_work: p.predictedDeepWorkMinutes,
        predicted_output: p.predictedOutputScore,
        confidence: p.confidence,
        model_version: p.modelVersion,
      })),
    });
  });

modelsV1.get('/status', async (c) => {
  const user = getAuthUser(c);
  const [latestRun, validation] = await Promise.all([
    prisma.modelRun.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    getValidationSummary(user.id),
  ]);

  return c.json({
    api_version: 'v1',
    model_version: latestRun?.modelVersion ?? null,
    status: latestRun?.status ?? 'not_trained',
    beats_baselines: latestRun?.beatsBaselines ?? false,
    sample_count: latestRun?.sampleCount ?? 0,
    training_period: latestRun
      ? {
          start: latestRun.trainingStart.toISOString().slice(0, 10),
          end: latestRun.trainingEnd.toISOString().slice(0, 10),
        }
      : null,
    validation: {
      ml_adds_value: validation.ml_adds_value,
      validated_days: validation.validated_days,
    },
    last_trained_at: latestRun?.createdAt.toISOString() ?? null,
  });
});
