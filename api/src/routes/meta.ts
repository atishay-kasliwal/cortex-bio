import { Hono } from 'hono';

import { requireAuth, type AppEnv } from '../middleware/auth.js';
import { getUserFreshness } from '../services/freshness.js';

export const meta = new Hono<AppEnv>();

meta.use('*', requireAuth);

meta.get('/freshness', async (c) => {
  const user = c.get('authUser');
  return c.json({
    user_id: user.id,
    ...(await getUserFreshness(user.id)),
  });
});
