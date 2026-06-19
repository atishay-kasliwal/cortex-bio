import { Hono } from 'hono';

import { resolveUser } from '../lib/user.js';
import { getTodayForecast } from '../services/forecast.js';

export const forecast = new Hono().get('/today', async (c) => {
  const user = await resolveUser();
  const result = await getTodayForecast(user.id, user.timezone);
  return c.json(result);
});
