import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import { requireFeature } from '../../middleware/feature-gate.js';

import {
  cortexBatchSchema,
  getCortexPerformance,
  ingestCortexDaily,
} from '../../services/cortex.js';
import { endSessionSchema } from '../../schemas/sessions.js';
import {
  endWorkSession,
  startWorkSession,
} from '../../services/sessions.js';
import { validatePredictions } from '../../services/validation.js';
import { getAuthUser } from './types.js';

const telemetrySchema = cortexBatchSchema;

export const cortexV1 = new Hono();
cortexV1.use('*', requireFeature('cortex'));

cortexV1
  .post('/sessions', async (c) => {
    const user = getAuthUser(c);
    const body = z
      .discriminatedUnion('action', [
        z.object({
          action: z.literal('start'),
          project_name: z.string().optional(),
          notes: z.string().optional(),
        }),
        z.object({
          action: z.literal('end'),
          session_id: z.string().uuid(),
          session_quality: endSessionSchema.shape.session_quality,
          notes: z.string().optional(),
        }),
      ])
      .parse(await c.req.json());

    if (body.action === 'start') {
      try {
        const session = await startWorkSession(
          user.id,
          body.project_name ?? 'General',
          body.notes,
        );
        return c.json({ api_version: 'v1', session }, 201);
      } catch (error) {
        if (error instanceof Error && error.message === 'ACTIVE_SESSION_EXISTS') {
          throw new HTTPException(409, { message: 'End your current session first' });
        }
        throw error;
      }
    }

    try {
      const session = await endWorkSession(
        user.id,
        body.session_id,
        body.session_quality,
        body.notes,
      );
      return c.json({ api_version: 'v1', session });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'SESSION_NOT_FOUND') {
          throw new HTTPException(404, { message: 'Session not found' });
        }
        if (error.message === 'SESSION_ALREADY_ENDED') {
          throw new HTTPException(409, { message: 'Session already ended' });
        }
      }
      throw error;
    }
  })
  .post('/telemetry', async (c) => {
    const user = getAuthUser(c);
    const body = telemetrySchema.parse(await c.req.json());
    const result = await ingestCortexDaily(user.id, body.records);
    const validation = await validatePredictions(user.id, result.dates);
    return c.json({ api_version: 'v1', ...result, validation });
  })
  .get('/performance', async (c) => {
    const user = getAuthUser(c);
    const days = Number(c.req.query('days') ?? 30);
    const performance = await getCortexPerformance(user.id, days);
    return c.json({ api_version: 'v1', ...performance });
  });
