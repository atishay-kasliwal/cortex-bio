import { config } from '../config.js';
import { prisma } from './prisma.js';
import { PROVIDER_IDS } from '../providers/registry.js';
import { createApiKey } from './api-keys.js';

export async function resolveUser(email?: string, timezone?: string) {
  const userEmail = email ?? config.DEFAULT_USER_EMAIL;
  return prisma.user.upsert({
    where: { email: userEmail },
    update: timezone ? { timezone } : {},
    create: {
      email: userEmail,
      timezone: timezone ?? 'America/Los_Angeles',
    },
  });
}

export async function resolveUserFromSupabase(input: {
  sub: string;
  email: string;
  fullName?: string;
  timezone?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { supabaseUserId: input.sub },
  });
  if (existing) {
    if (input.fullName && !existing.fullName) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { fullName: input.fullName },
      });
    }
    return existing;
  }

  const byEmail = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: {
        supabaseUserId: input.sub,
        fullName: input.fullName ?? byEmail.fullName,
        timezone: input.timezone ?? byEmail.timezone,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: input.email,
      supabaseUserId: input.sub,
      fullName: input.fullName,
      timezone: input.timezone ?? 'America/Los_Angeles',
    },
  });
}

export async function provisionUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const providerRows = await Promise.all(
    PROVIDER_IDS.map((provider) =>
      prisma.providerConnection.upsert({
        where: { userId_provider: { userId, provider } },
        update: {},
        create: { userId, provider, status: 'disconnected' },
      }),
    ),
  );

  const existingKeys = await prisma.apiKey.count({
    where: { userId, revokedAt: null },
  });

  let defaultKey: { id: string; prefix: string } | null = null;
  if (existingKeys === 0) {
    const created = await createApiKey(userId, 'Default', 'free');
    defaultKey = { id: created.id, prefix: created.prefix };
  }

  const completed = user.onboardingCompletedAt != null;
  if (!completed) {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
    });
  }

  return {
    user_id: user.id,
    cortex_user_id: user.id,
    supabase_user_id: user.supabaseUserId,
    email: user.email,
    full_name: user.fullName,
    timezone: user.timezone,
    providers: providerRows.map((p) => ({
      provider: p.provider,
      status: p.status,
      connected_at: p.connectedAt?.toISOString() ?? null,
      last_sync_at: p.lastSyncAt?.toISOString() ?? null,
    })),
    default_api_key: defaultKey,
    provisioned: true,
  };
}
