import { Hono } from 'hono';

import { requireAuth, type AppEnv } from '../middleware/auth.js';
import { provisionUser } from '../lib/user.js';

export const authRoutes = new Hono<AppEnv>();

authRoutes.use('*', requireAuth);

authRoutes.post('/provision', async (c) => {
  const user = c.get('authUser');
  const result = await provisionUser(user.id);
  return c.json(result);
});
