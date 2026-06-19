import { prisma } from '../lib/prisma.js';
import { PROVIDER_IDS } from '../providers/registry.js';

export type OnboardingStep =
  | 'connect_provider'
  | 'sync_data'
  | 'build_baseline'
  | 'view_forecast'
  | 'complete';

export type UserFreshness = {
  last_sync_at: string | null;
  last_readiness_at: string | null;
  last_forecast_at: string | null;
  has_health_data: boolean;
  has_baseline: boolean;
  has_readiness: boolean;
  has_forecast: boolean;
  connected_providers: number;
  onboarding_step: OnboardingStep;
  onboarding_complete: boolean;
};

function resolveOnboardingStep(input: {
  hasHealthData: boolean;
  hasBaseline: boolean;
  hasForecast: boolean;
  connectedProviders: number;
}): OnboardingStep {
  if (input.hasForecast) return 'complete';
  if (input.hasBaseline) return 'view_forecast';
  if (input.hasHealthData) return 'build_baseline';
  if (input.connectedProviders > 0) return 'sync_data';
  return 'connect_provider';
}

export async function getUserFreshness(userId: string): Promise<UserFreshness> {
  const [
    lastSample,
    lastFeature,
    lastWindow,
    featureDays,
    connectedProviders,
    providerLastSync,
  ] = await Promise.all([
    prisma.healthSample.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.dailyFeature.findFirst({
      where: { userId, readinessScore: { not: null } },
      orderBy: { computedAt: 'desc' },
      select: { computedAt: true },
    }),
    prisma.cognitiveWindow.findFirst({
      where: { userId },
      orderBy: { computedAt: 'desc' },
      select: { computedAt: true, hourlyCurve: true },
    }),
    prisma.dailyFeature.count({
      where: {
        userId,
        OR: [{ avgHrv: { not: null } }, { sleepDuration: { not: null } }],
      },
    }),
    prisma.providerConnection.count({
      where: { userId, status: 'connected' },
    }),
    prisma.providerConnection.findFirst({
      where: { userId, lastSyncAt: { not: null } },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true },
    }),
  ]);

  const lastSyncAt =
    providerLastSync?.lastSyncAt ?? lastSample?.createdAt ?? null;

  const hasHealthData = featureDays >= 1 || lastSample != null;
  const hasBaseline = featureDays >= 7;
  const hasReadiness = lastFeature != null;
  const curve = lastWindow?.hourlyCurve;
  const hasForecast =
    lastWindow != null &&
    Array.isArray(curve) &&
    (curve as unknown[]).length > 0;

  const onboardingStep = resolveOnboardingStep({
    hasHealthData,
    hasBaseline,
    hasForecast,
    connectedProviders,
  });

  return {
    last_sync_at: lastSyncAt?.toISOString() ?? null,
    last_readiness_at: lastFeature?.computedAt.toISOString() ?? null,
    last_forecast_at: lastWindow?.computedAt.toISOString() ?? null,
    has_health_data: hasHealthData,
    has_baseline: hasBaseline,
    has_readiness: hasReadiness,
    has_forecast: hasForecast,
    connected_providers: connectedProviders,
    onboarding_step: onboardingStep,
    onboarding_complete: onboardingStep === 'complete',
  };
}

export async function ensureProviderStubs(userId: string) {
  await Promise.all(
    PROVIDER_IDS.map((provider) =>
      prisma.providerConnection.upsert({
        where: { userId_provider: { userId, provider } },
        update: {},
        create: { userId, provider, status: 'disconnected' },
      }),
    ),
  );
}
