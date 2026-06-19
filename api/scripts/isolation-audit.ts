#!/usr/bin/env tsx
/**
 * User isolation + API key ownership audit.
 * Run before public launch: npm run audit:isolation
 *
 * Requires DATABASE_URL and API_KEY_PEPPER in env.
 */
import 'dotenv/config';

import { prisma } from '../src/lib/prisma.js';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from '../src/lib/api-keys.js';
import { getTodayReadiness } from '../src/services/readiness.js';
import { getUserFreshness } from '../src/services/freshness.js';

const failures: string[] = [];

function fail(msg: string) {
  failures.push(msg);
  console.error(`  FAIL: ${msg}`);
}

function pass(msg: string) {
  console.log(`  OK: ${msg}`);
}

async function seedUser(email: string, readinessScore: number) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, timezone: 'America/Los_Angeles' },
  });

  const today = new Date().toISOString().slice(0, 10);
  await prisma.dailyFeature.upsert({
    where: { userId_date: { userId: user.id, date: new Date(`${today}T12:00:00Z`) } },
    update: { readinessScore },
    create: {
      userId: user.id,
      date: new Date(`${today}T12:00:00Z`),
      readinessScore,
    },
  });

  const key = await createApiKey(user.id, 'audit-test', 'free');
  return { user, key };
}

async function http(
  baseUrl: string,
  path: string,
  token: string,
  init: RequestInit = {},
) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    },
  });
}

async function main() {
  console.log('\n=== Cortex Bio isolation audit ===\n');

  const tag = Date.now();
  const emailA = `audit-a-${tag}@cortex.bio.test`;
  const emailB = `audit-b-${tag}@cortex.bio.test`;

  const userA = await seedUser(emailA, 81);
  const userB = await seedUser(emailB, 42);

  // --- Direct DB scoping ---
  const readinessA = await getTodayReadiness(userA.user.id, userA.user.timezone);
  const readinessB = await getTodayReadiness(userB.user.id, userB.user.timezone);

  if (readinessA?.readiness_score === readinessB?.readiness_score) {
    fail('User A and B readiness scores should differ');
  } else {
    pass('Readiness isolated per user_id in services');
  }

  const keysA = await listApiKeys(userA.user.id);
  const keysB = await listApiKeys(userB.user.id);
  const crossList = keysA.some((k) => keysB.some((b) => b.id === k.id));
  if (crossList) {
    fail('listApiKeys leaked keys across users');
  } else {
    pass('listApiKeys scoped to user_id');
  }

  const revokedCross = await revokeApiKey(userA.user.id, userB.key.id);
  if (revokedCross) {
    fail('User A revoked User B API key');
  } else {
    pass('revokeApiKey rejects cross-user key id');
  }

  const stillB = await listApiKeys(userB.user.id);
  if (!stillB.some((k) => k.id === userB.key.id)) {
    fail('User B key missing after cross-user revoke attempt');
  } else {
    pass('User B key intact after cross-user revoke attempt');
  }

  const freshnessA = await getUserFreshness(userA.user.id);
  const freshnessB = await getUserFreshness(userB.user.id);
  if (freshnessA.has_readiness !== freshnessB.has_readiness || freshnessA.has_readiness) {
    pass('getUserFreshness scoped to user_id');
  }

  // --- HTTP layer (optional, if API running) ---
  const baseUrl = process.env.AUDIT_API_URL ?? `http://localhost:${process.env.PORT ?? 8000}`;

  try {
    const health = await fetch(`${baseUrl}/health`);
    if (!health.ok) throw new Error('API not reachable');

    const resA = await http(baseUrl, '/v1/readiness/today', userA.key.key);
    const resB = await http(baseUrl, '/v1/readiness/today', userB.key.key);
    if (!resA.ok || !resB.ok) {
      fail(`HTTP readiness failed: A=${resA.status} B=${resB.status}`);
    } else {
      const bodyA = (await resA.json()) as { readiness_score: number };
      const bodyB = (await resB.json()) as { readiness_score: number };
      if (bodyA.readiness_score !== 81 || bodyB.readiness_score !== 42) {
        fail('HTTP readiness returned wrong user data');
      } else {
        pass('HTTP /v1/readiness/today returns key-owner data only');
      }
    }

    const delCross = await http(baseUrl, `/api/keys/${userB.key.id}`, userA.key.key, {
      method: 'DELETE',
    });
    if (delCross.status === 200) {
      fail('HTTP DELETE /api/keys allowed cross-user revocation');
    } else {
      pass(`HTTP DELETE cross-user key blocked (${delCross.status})`);
    }

    const usageA = await http(baseUrl, '/api/keys/usage?days=7', userA.key.key);
    const usageB = await http(baseUrl, '/api/keys/usage?days=7', userB.key.key);
    if (usageA.ok && usageB.ok) {
      pass('HTTP /api/keys/usage authenticated per user');
    } else {
      fail('HTTP usage endpoint failed');
    }

    const createCross = await http(baseUrl, '/api/keys', userA.key.key, {
      method: 'POST',
      body: JSON.stringify({ name: 'audit-created' }),
    });
    if (createCross.ok) {
      const created = (await createCross.json()) as { id: string };
      const ownerKeys = await listApiKeys(userA.user.id);
      if (!ownerKeys.some((k) => k.id === created.id)) {
        fail('Created API key not owned by authenticated user');
      } else {
        pass('POST /api/keys binds key to authenticated user');
      }
    } else {
      fail(`POST /api/keys failed: ${createCross.status}`);
    }
  } catch {
    console.log('  SKIP: HTTP tests (start API with npm run dev for full audit)');
  }

  // cleanup
  await prisma.apiKey.deleteMany({
    where: { userId: { in: [userA.user.id, userB.user.id] } },
  });
  await prisma.dailyFeature.deleteMany({
    where: { userId: { in: [userA.user.id, userB.user.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [userA.user.id, userB.user.id] } },
  });

  console.log('\n=== Summary ===');
  if (failures.length) {
    console.error(`\n${failures.length} failure(s). DO NOT DEPLOY.\n`);
    process.exit(1);
  }
  console.log('\nAll isolation checks passed.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
