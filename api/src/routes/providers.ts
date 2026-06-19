import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { requireAuth, type AppEnv } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { PROVIDER_IDS, PROVIDER_LABELS } from '../providers/registry.js';

export const providers = new Hono<AppEnv>();

providers.use('*', requireAuth);

providers.get('', async (c) => {
  const user = c.get('authUser');
  const rows = await prisma.providerConnection.findMany({
    where: { userId: user.id },
    orderBy: { provider: 'asc' },
  });

  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return c.json({
    providers: PROVIDER_IDS.map((id) => {
      const row = byProvider.get(id);
      return {
        id,
        name: PROVIDER_LABELS[id],
        status: row?.status ?? 'disconnected',
        connected: row?.status === 'connected',
        connected_at: row?.connectedAt?.toISOString() ?? null,
        last_sync_at: row?.lastSyncAt?.toISOString() ?? null,
      };
    }),
  });
});

providers.post('/:id/connect', async (c) => {
  const user = c.get('authUser');
  const provider = c.req.param('id');
  if (!(PROVIDER_IDS as readonly string[]).includes(provider)) {
    throw new HTTPException(404, { message: 'Unknown provider' });
  }

  const row = await prisma.providerConnection.upsert({
    where: { userId_provider: { userId: user.id, provider } },
    update: { status: 'pending', metadata: { requested_at: new Date().toISOString() } },
    create: {
      userId: user.id,
      provider,
      status: 'pending',
      metadata: { requested_at: new Date().toISOString() },
    },
  });

  return c.json({
    provider: row.provider,
    status: row.status,
    message: `${PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS]} connection requested. OAuth integration coming soon.`,
  });
});

providers.post('/:id/disconnect', async (c) => {
  const user = c.get('authUser');
  const provider = c.req.param('id');
  if (!(PROVIDER_IDS as readonly string[]).includes(provider)) {
    throw new HTTPException(404, { message: 'Unknown provider' });
  }

  const row = await prisma.providerConnection.upsert({
    where: { userId_provider: { userId: user.id, provider } },
    update: {
      status: 'disconnected',
      connectedAt: null,
      lastSyncAt: null,
    },
    create: { userId: user.id, provider, status: 'disconnected' },
  });

  return c.json({ provider: row.provider, status: row.status, disconnected: true });
});
