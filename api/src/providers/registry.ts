export const PROVIDER_IDS = [
  'apple',
  'whoop',
  'oura',
  'garmin',
  'fitbit',
  'polar',
  'cortex',
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  apple: 'Apple Health',
  whoop: 'WHOOP',
  oura: 'Oura',
  garmin: 'Garmin',
  fitbit: 'Fitbit',
  polar: 'Polar',
  cortex: 'Atriveo Cortex',
};

export type ProviderIngestPayload = {
  samples?: unknown[];
  sleep_sessions?: unknown[];
  workouts?: unknown[];
  metadata?: Record<string, unknown>;
};

export interface WearableProvider {
  id: ProviderId;
  label: string;
  ingest(userId: string, payload: ProviderIngestPayload): Promise<{ accepted: boolean }>;
}

export class ProviderNotImplementedError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" integration is not yet available`);
    this.name = 'ProviderNotImplementedError';
  }
}

const stubProvider = (id: ProviderId): WearableProvider => ({
  id,
  label: PROVIDER_LABELS[id],
  async ingest() {
    throw new ProviderNotImplementedError(id);
  },
});

export const providerRegistry: Record<ProviderId, WearableProvider> =
  Object.fromEntries(
    PROVIDER_IDS.map((id) => [id, stubProvider(id)]),
  ) as Record<ProviderId, WearableProvider>;

export function getProvider(id: string): WearableProvider | null {
  if (!(PROVIDER_IDS as readonly string[]).includes(id)) return null;
  return providerRegistry[id as ProviderId];
}
