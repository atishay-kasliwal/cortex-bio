import { config } from '../config.js';

export type FeatureName = 'forecasting' | 'ml' | 'cortex' | 'organizations';

export const featureFlags = {
  forecasting: config.FEATURE_FORECASTING,
  ml: config.FEATURE_ML,
  cortex: config.FEATURE_CORTEX,
  organizations: config.FEATURE_ORGANIZATIONS,
} as const;

export function isFeatureEnabled(feature: FeatureName): boolean {
  return featureFlags[feature];
}

export function getPublicFeatures() {
  return { ...featureFlags };
}
