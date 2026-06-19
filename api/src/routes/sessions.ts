import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { resolveUser } from '../lib/user.js';
import { endSessionSchema, startSessionSchema } from '../schemas/sessions.js';
import {
  endWorkSession,
  getActiveSession,
  listWorkSessions,
  startWorkSession,
} from '../services/sessions.js';

export const sessions = new Hono()
  .get('/active', async (c) => {
    const user = await resolveUser();
    const active = await getActiveSession(user.id);
    return c.json({ session: active });
  })
  .get('/', async (c) => {
    const user = await resolveUser();
    const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
    const rows = await listWorkSessions(user.id, limit);
    return c.json({ sessions: rows });
  })
  .post('/', async (c) => {
    const body = startSessionSchema.parse(await c.req.json());
    const user = await resolveUser();

    try {
      const session = await startWorkSession(
        user.id,
        body.project_name,
        body.notes,
      );
      return c.json({ session }, 201);
    } catch (error) {
      if (error instanceof Error && error.message === 'ACTIVE_SESSION_EXISTS') {
        throw new HTTPException(409, { message: 'End your current session first' });
      }
      throw error;
    }
  })
  .patch('/:id/end', async (c) => {
    const sessionId = c.req.param('id');
    const body = endSessionSchema.parse(await c.req.json());
    const user = await resolveUser();

    try {
      const session = await endWorkSession(
        user.id,
        sessionId,
        body.session_quality,
        body.notes,
      );
      return c.json({ session });
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
  });
