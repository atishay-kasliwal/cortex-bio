import { DateTime } from 'luxon';

import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import {
  localDayBoundsFromKey,
  localHourBoundsFromKey,
  toDateOnly,
} from '../lib/timezone.js';
import {
  AVG_DAILY_METRICS,
  CUMULATIVE_DAILY_METRICS,
  METRIC_TYPES,
  SUM_DAILY_METRICS,
} from './metrics.js';

const MORNING_START_HOUR = 5;
const MORNING_END_HOUR = 10;

type MetricAgg = {
  values: number[];
  morningValues: number[];
};

function aggregateSamples(
  samples: { metricType: string; value: number; startTime: Date }[],
  timezone: string,
): Map<string, MetricAgg> {
  const byMetric = new Map<string, MetricAgg>();

  for (const sample of samples) {
    if (!byMetric.has(sample.metricType)) {
      byMetric.set(sample.metricType, { values: [], morningValues: [] });
    }
    const bucket = byMetric.get(sample.metricType)!;
    bucket.values.push(sample.value);

    const localHour = DateTime.fromJSDate(sample.startTime, { zone: 'utc' })
      .setZone(timezone).hour;
    if (localHour >= MORNING_START_HOUR && localHour < MORNING_END_HOUR) {
      bucket.morningValues.push(sample.value);
    }
  }

  return byMetric;
}

function aggregateMetric(metricType: string, agg: MetricAgg): number | null {
  if (agg.values.length === 0) return null;

  if (CUMULATIVE_DAILY_METRICS.has(metricType)) {
    return Math.max(...agg.values);
  }
  if (SUM_DAILY_METRICS.has(metricType)) {
    return agg.values.reduce((sum, v) => sum + v, 0);
  }
  if (AVG_DAILY_METRICS.has(metricType)) {
    return agg.values.reduce((sum, v) => sum + v, 0) / agg.values.length;
  }
  return agg.values.reduce((sum, v) => sum + v, 0) / agg.values.length;
}

function morningMetric(metricType: string, agg: MetricAgg): number | null {
  if (agg.morningValues.length === 0) return null;
  if (metricType === METRIC_TYPES.HRV) {
    return (
      agg.morningValues.reduce((sum, v) => sum + v, 0) / agg.morningValues.length
    );
  }
  if (metricType === METRIC_TYPES.RESTING_HEART_RATE) {
    return Math.min(...agg.morningValues);
  }
  return (
    agg.morningValues.reduce((sum, v) => sum + v, 0) / agg.morningValues.length
  );
}

async function computeHrvBaseline(
  userId: string,
  beforeDate: Date,
): Promise<number | null> {
  const windowStart = DateTime.fromJSDate(beforeDate, { zone: 'utc' })
    .minus({ days: 30 })
    .toJSDate();

  const rows = await prisma.dailyFeature.findMany({
    where: {
      userId,
      date: { gte: windowStart, lt: beforeDate },
      avgHrv: { not: null },
    },
    select: { avgHrv: true },
  });

  if (rows.length < 7) return null;

  const values = rows.map((r) => r.avgHrv!);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeFeatureConfidence(fields: {
  hasSleep: boolean;
  hasHrv: boolean;
  hasRestingHr: boolean;
  hasSteps: boolean;
  hasActivity: boolean;
}): number {
  let score = 0;
  if (fields.hasSleep) score += 0.35;
  if (fields.hasHrv) score += 0.25;
  if (fields.hasRestingHr) score += 0.15;
  if (fields.hasSteps) score += 0.15;
  if (fields.hasActivity) score += 0.1;
  return Math.round(score * 100) / 100;
}

export async function computeDailyFeature(
  userId: string,
  dateKey: string,
  timezone: string,
): Promise<void> {
  const localDate = DateTime.fromISO(dateKey, { zone: timezone });
  const dateOnly = toDateOnly(localDate);
  const { start: dayStart, end: dayEnd } = localDayBoundsFromKey(dateKey, timezone);

  const sleepSessions = await prisma.sleepSession.findMany({
    where: {
      userId,
      sleepEnd: { gte: dayStart, lt: dayEnd },
    },
  });

  let sleepDuration: number | null = null;
  let sleepEfficiency: number | null = null;

  if (sleepSessions.length > 0) {
    const primary = sleepSessions.reduce((best, session) => {
      const asleep =
        session.remMinutes + session.deepMinutes + session.coreMinutes;
      const bestAsleep = best.remMinutes + best.deepMinutes + best.coreMinutes;
      return asleep > bestAsleep ? session : best;
    });

    const asleepMinutes =
      primary.remMinutes + primary.deepMinutes + primary.coreMinutes;
    const durationMinutes =
      asleepMinutes > 0 ? asleepMinutes : primary.durationMinutes;

    sleepDuration = durationMinutes / 60;
    sleepEfficiency = primary.sleepEfficiency;
  }

  const sleepDebtHours =
    sleepDuration != null
      ? Math.max(0, config.SLEEP_TARGET_HOURS - sleepDuration)
      : null;

  const samples = await prisma.healthSample.findMany({
    where: {
      userId,
      startTime: { gte: dayStart, lt: dayEnd },
    },
    select: { metricType: true, value: true, startTime: true },
  });

  const byMetric = aggregateSamples(samples, timezone);

  const avgHrv =
    aggregateMetric(METRIC_TYPES.HRV, byMetric.get(METRIC_TYPES.HRV) ?? { values: [], morningValues: [] });
  const restingHrMorning = morningMetric(
    METRIC_TYPES.RESTING_HEART_RATE,
    byMetric.get(METRIC_TYPES.RESTING_HEART_RATE) ?? { values: [], morningValues: [] },
  );
  const restingHrDaily = aggregateMetric(
    METRIC_TYPES.RESTING_HEART_RATE,
    byMetric.get(METRIC_TYPES.RESTING_HEART_RATE) ?? { values: [], morningValues: [] },
  );
  const restingHr = restingHrMorning ?? restingHrDaily;

  const steps = aggregateMetric(
    METRIC_TYPES.STEPS,
    byMetric.get(METRIC_TYPES.STEPS) ?? { values: [], morningValues: [] },
  );
  const activeCalories = aggregateMetric(
    METRIC_TYPES.ACTIVE_ENERGY,
    byMetric.get(METRIC_TYPES.ACTIVE_ENERGY) ?? { values: [], morningValues: [] },
  );
  let exerciseMinutes = aggregateMetric(
    METRIC_TYPES.EXERCISE_MINUTES,
    byMetric.get(METRIC_TYPES.EXERCISE_MINUTES) ?? { values: [], morningValues: [] },
  );

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      startTime: { gte: dayStart, lt: dayEnd },
    },
    select: { durationMinutes: true },
  });
  const workoutMinutes = workouts.reduce((sum, w) => sum + w.durationMinutes, 0);
  if (workoutMinutes > 0) {
    exerciseMinutes = Math.max(exerciseMinutes ?? 0, workoutMinutes);
  }

  const hrvBaseline = await computeHrvBaseline(userId, dateOnly);
  const hrvVsBaselinePct =
    avgHrv != null && hrvBaseline != null && hrvBaseline > 0
      ? ((avgHrv - hrvBaseline) / hrvBaseline) * 100
      : null;

  const featureConfidence = computeFeatureConfidence({
    hasSleep: sleepDuration != null,
    hasHrv: avgHrv != null,
    hasRestingHr: restingHr != null,
    hasSteps: steps != null,
    hasActivity: (activeCalories ?? 0) > 0 || (exerciseMinutes ?? 0) > 0,
  });

  await prisma.dailyFeature.upsert({
    where: {
      userId_date: { userId, date: dateOnly },
    },
    create: {
      userId,
      date: dateOnly,
      sleepDuration,
      sleepEfficiency,
      sleepDebtHours,
      avgHrv,
      hrvVsBaselinePct,
      restingHr,
      steps,
      exerciseMinutes,
      activeCalories,
      readinessScore: null,
      featureConfidence,
    },
    update: {
      sleepDuration,
      sleepEfficiency,
      sleepDebtHours,
      avgHrv,
      hrvVsBaselinePct,
      restingHr,
      steps,
      exerciseMinutes,
      activeCalories,
      readinessScore: null,
      featureConfidence,
      computedAt: new Date(),
    },
  });
}

export async function computeHourlyFeatures(
  userId: string,
  dateKey: string,
  timezone: string,
): Promise<void> {
  const localDate = DateTime.fromISO(dateKey, { zone: timezone });
  const dateOnly = toDateOnly(localDate);

  for (let hour = 0; hour < 24; hour++) {
    const { start, end } = localHourBoundsFromKey(dateKey, hour, timezone);

    const samples = await prisma.healthSample.findMany({
      where: {
        userId,
        startTime: { gte: start, lt: end },
        metricType: {
          in: [
            METRIC_TYPES.HEART_RATE,
            METRIC_TYPES.HRV,
            METRIC_TYPES.STEPS,
            METRIC_TYPES.RESTING_HEART_RATE,
          ],
        },
      },
      select: { metricType: true, value: true },
    });

    const hrValues = samples
      .filter(
        (s) =>
          s.metricType === METRIC_TYPES.HEART_RATE ||
          s.metricType === METRIC_TYPES.RESTING_HEART_RATE,
      )
      .map((s) => s.value);
    const hrvValues = samples
      .filter((s) => s.metricType === METRIC_TYPES.HRV)
      .map((s) => s.value);
    const stepValues = samples
      .filter((s) => s.metricType === METRIC_TYPES.STEPS)
      .map((s) => s.value);

    const avgHeartRate =
      hrValues.length > 0
        ? hrValues.reduce((sum, v) => sum + v, 0) / hrValues.length
        : null;
    const avgHrv =
      hrvValues.length > 0
        ? hrvValues.reduce((sum, v) => sum + v, 0) / hrvValues.length
        : null;
    const steps =
      stepValues.length > 0
        ? CUMULATIVE_DAILY_METRICS.has(METRIC_TYPES.STEPS)
          ? Math.max(...stepValues)
          : stepValues.reduce((sum, v) => sum + v, 0)
        : null;

    const activityScore =
      steps != null ? Math.min(steps / 1000, 1) : null;

    const timestampHour = DateTime.fromISO(dateKey, { zone: timezone })
      .set({ hour, minute: 0, second: 0, millisecond: 0 })
      .toUTC()
      .toJSDate();

    await prisma.hourlyFeature.upsert({
      where: {
        userId_timestampHour: { userId, timestampHour },
      },
      create: {
        userId,
        timestampHour,
        avgHeartRate,
        avgHrv,
        steps,
        activityScore,
      },
      update: {
        avgHeartRate,
        avgHrv,
        steps,
        activityScore,
        computedAt: new Date(),
      },
    });
  }
}

export async function computeFeaturesForDates(
  userId: string,
  dateKeys: string[],
  timezone: string,
): Promise<string[]> {
  const computed: string[] = [];

  for (const dateKey of dateKeys) {
    await computeDailyFeature(userId, dateKey, timezone);
    await computeHourlyFeatures(userId, dateKey, timezone);
    computed.push(dateKey);
  }

  return computed;
}

export async function getBaselines(userId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      user_id: string;
      hrv_baseline_30d: number | null;
      hrv_stddev_30d: number | null;
      resting_hr_baseline_30d: number | null;
      sleep_baseline_30d: number | null;
      steps_baseline_30d: number | null;
      readiness_baseline_30d: number | null;
      sample_days_30d: number;
    }>
  >`
    SELECT * FROM v_user_baselines WHERE user_id = ${userId}::uuid
  `;
  return rows[0] ?? null;
}

export async function getDailyFeature(userId: string, dateKey: string) {
  const date = toDateOnly(DateTime.fromISO(dateKey, { zone: 'utc' }));
  return prisma.dailyFeature.findUnique({
    where: { userId_date: { userId, date } },
  });
}
