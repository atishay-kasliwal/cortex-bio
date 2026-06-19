import { createHash, randomBytes } from 'crypto';

import { config } from '../config.js';
import { prisma } from './prisma.js';

export type ApiKeyTier = 'free' | 'pro' | 'enterprise';

const TIER_RATE_LIMITS: Record<ApiKeyTier, number> = {
  free: 60,
  pro: 600,
  enterprise: 6000,
};

export function hashApiKey(rawKey: string): string {
  return createHash('sha256')
    .update(`${rawKey}:${config.API_KEY_PEPPER}`)
    .digest('hex');
}

export function extractKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 16);
}

export function generateRawApiKey(tier: ApiKeyTier = 'free'): string {
  const prefix = tier === 'free' ? 'cb_test' : 'cb_live';
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}

export async function createApiKey(
  userId: string,
  name: string,
  tier: ApiKeyTier = 'free',
): Promise<{ id: string; key: string; prefix: string; tier: ApiKeyTier; rate_limit: number }> {
  const rawKey = generateRawApiKey(tier);
  const keyPrefix = extractKeyPrefix(rawKey);
  const keyHash = hashApiKey(rawKey);
  const rateLimit = TIER_RATE_LIMITS[tier];

  const row = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyPrefix,
      keyHash,
      tier,
      rateLimit,
    },
  });

  return {
    id: row.id,
    key: rawKey,
    prefix: keyPrefix,
    tier,
    rate_limit: rateLimit,
  };
}

export async function verifyApiKey(rawKey: string) {
  if (!rawKey.startsWith('cb_test_') && !rawKey.startsWith('cb_live_')) {
    return null;
  }

  const keyPrefix = extractKeyPrefix(rawKey);
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyPrefix,
      keyHash,
      revokedAt: null,
    },
    include: { user: true },
  });

  if (!apiKey) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    apiKey: {
      id: apiKey.id,
      tier: apiKey.tier as ApiKeyTier,
      rateLimit: apiKey.rateLimit,
      name: apiKey.name,
    },
    user: {
      id: apiKey.user.id,
      email: apiKey.user.email,
      timezone: apiKey.user.timezone,
    },
  };
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await prisma.apiKey.updateMany({
    where: { id: keyId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      tier: true,
      rateLimit: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}
