import { Hono } from 'hono';
import { z } from 'zod';

import { requireAuth, type AppEnv } from '../middleware/auth.js';
import { parseChronotypeEstimate } from '../services/chronotype.js';
import { prisma } from '../lib/prisma.js';

const patchProfileSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

export const profile = new Hono<AppEnv>();

profile.use('*', requireAuth);

profile.get('', async (c) => {
  const authUser = c.get('authUser');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: authUser.id } });
  const chronotype = parseChronotypeEstimate(user.chronotypeEstimate);

  return c.json({
    user_id: user.id,
    cortex_user_id: user.id,
    supabase_user_id: user.supabaseUserId,
    email: user.email,
    full_name: user.fullName,
    timezone: user.timezone,
    chronotype,
    onboarding_completed_at: user.onboardingCompletedAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
  });
});

profile.patch('', async (c) => {
  const authUser = c.get('authUser');
  const body = patchProfileSchema.parse(await c.req.json());

  const user = await prisma.user.update({
    where: { id: authUser.id },
    data: {
      fullName: body.full_name,
      timezone: body.timezone,
    },
  });

  return c.json({
    user_id: user.id,
    email: user.email,
    full_name: user.fullName,
    timezone: user.timezone,
  });
});

profile.delete('', async (c) => {
  const authUser = c.get('authUser');
  await prisma.user.delete({ where: { id: authUser.id } });
  return c.json({ deleted: true });
});
