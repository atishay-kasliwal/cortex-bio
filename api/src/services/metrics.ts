/** Canonical metric_type values stored in health_samples. */
export const METRIC_TYPES = {
  HEART_RATE: 'heart_rate',
  RESTING_HEART_RATE: 'resting_heart_rate',
  HRV: 'hrv',
  RESPIRATORY_RATE: 'respiratory_rate',
  SPO2: 'spo2',
  WRIST_TEMPERATURE: 'wrist_temperature',
  STEPS: 'steps',
  ACTIVE_ENERGY: 'active_energy',
  EXERCISE_MINUTES: 'exercise_minutes',
} as const;

const ALIASES: Record<string, string> = {
  resting_hr: METRIC_TYPES.RESTING_HEART_RATE,
  rhr: METRIC_TYPES.RESTING_HEART_RATE,
  heart_rate_variability: METRIC_TYPES.HRV,
  hrv_sdnn: METRIC_TYPES.HRV,
  step_count: METRIC_TYPES.STEPS,
  active_calories: METRIC_TYPES.ACTIVE_ENERGY,
  apple_exercise_time: METRIC_TYPES.EXERCISE_MINUTES,
  exercise_time: METRIC_TYPES.EXERCISE_MINUTES,
  blood_oxygen_saturation: METRIC_TYPES.SPO2,
  oxygen_saturation: METRIC_TYPES.SPO2,
  apple_sleeping_wrist_temperature: METRIC_TYPES.WRIST_TEMPERATURE,
};

export function normalizeMetricType(raw: string): string {
  const key = raw.trim().toLowerCase();
  return ALIASES[key] ?? key;
}

export const CUMULATIVE_DAILY_METRICS = new Set<string>([METRIC_TYPES.STEPS]);

export const SUM_DAILY_METRICS = new Set<string>([
  METRIC_TYPES.ACTIVE_ENERGY,
  METRIC_TYPES.EXERCISE_MINUTES,
]);

export const AVG_DAILY_METRICS = new Set<string>([
  METRIC_TYPES.HRV,
  METRIC_TYPES.RESTING_HEART_RATE,
  METRIC_TYPES.HEART_RATE,
  METRIC_TYPES.RESPIRATORY_RATE,
  METRIC_TYPES.SPO2,
  METRIC_TYPES.WRIST_TEMPERATURE,
]);

export type NormalizedSample = {
  metricType: string;
  metricSubtype: string | null;
  value: number;
  unit: string | null;
  startTime: Date;
  endTime: Date | null;
  sourceDevice: string | null;
  sourceApp: string | null;
  metadata: Record<string, unknown>;
};

export function sampleDedupKey(sample: {
  metricType: string;
  startTime: Date;
  sourceDevice?: string | null;
  metricSubtype?: string | null;
}): string {
  return `${sample.metricType}|${sample.startTime.toISOString()}|${sample.sourceDevice ?? ''}|${sample.metricSubtype ?? ''}`;
}
