import { DateTime } from 'luxon';

import { prisma } from '../lib/prisma.js';
import { toDateOnly } from '../lib/timezone.js';

export const TARGET_TYPES = ['attention', 'deep_work', 'output'] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

const TARGET_FIELDS = {
  attention: {
    predicted: 'predictedAttention' as const,
    actual: 'attentionScore' as const,
    actualPrediction: 'actualAttention' as const,
  },
  deep_work: {
    predicted: 'predictedDeepWorkMinutes' as const,
    actual: 'deepWorkMinutes' as const,
    actualPrediction: 'actualDeepWorkMinutes' as const,
  },
  output: {
    predicted: 'predictedOutputScore' as const,
    actual: 'outputScore' as const,
    actualPrediction: 'actualOutputScore' as const,
  },
};

function pctError(predicted: number, actual: number): number | null {
  if (actual === 0) return null;
  return Math.round((Math.abs(predicted - actual) / Math.abs(actual)) * 1000) / 10;
}

function mae(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function rmse(errors: number[]): number {
  if (errors.length === 0) return 0;
  return Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / errors.length);
}

function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 3) return null;
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    num += dx * dy;
    denX += dx ** 2;
    denY += dy ** 2;
  }
  const den = Math.sqrt(denX * denY);
  if (den === 0) return null;
  return Math.round((num / den) * 1000) / 1000;
}

function dateKey(d: Date): string {
  return DateTime.fromJSDate(d, { zone: 'utc' }).toISODate()!;
}

function addDaysKey(key: string, days: number): string {
  return DateTime.fromISO(key, { zone: 'utc' }).plus({ days }).toISODate()!;
}

async function loadCortexByDate(userId: string) {
  const rows = await prisma.cortexDailyMetric.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });
  const map = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    map.set(dateKey(row.date), row);
  }
  return map;
}

async function loadReadinessByDate(userId: string) {
  const rows = await prisma.dailyFeature.findMany({
    where: { userId },
    select: { date: true, readinessScore: true },
    orderBy: { date: 'asc' },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.readinessScore != null) {
      map.set(dateKey(row.date), row.readinessScore);
    }
  }
  return map;
}

function actualForTarget(
  cortex: { attentionScore: number | null; deepWorkMinutes: number | null; outputScore: number | null },
  target: TargetType,
): number | null {
  const field = TARGET_FIELDS[target].actual;
  const value = cortex[field];
  return value != null ? Number(value) : null;
}

export async function validatePredictions(
  userId: string,
  dates?: string[],
): Promise<{ validated: number; metrics_updated: number }> {
  const predictions = await prisma.performancePrediction.findMany({
    where: {
      userId,
      ...(dates?.length
        ? {
            predictionDate: {
              in: dates.map((d) => toDateOnly(DateTime.fromISO(d, { zone: 'utc' }))),
            },
          }
        : {}),
    },
    orderBy: { predictionDate: 'asc' },
  });

  if (predictions.length === 0) {
    return { validated: 0, metrics_updated: 0 };
  }

  const cortexByDate = await loadCortexByDate(userId);
  let validated = 0;

  for (const prediction of predictions) {
    const key = dateKey(prediction.predictionDate);
    const cortex = cortexByDate.get(key);
    if (!cortex) continue;

    const actualUpdates: Record<string, number> = {};

    for (const targetType of TARGET_TYPES) {
      const fields = TARGET_FIELDS[targetType];
      const predicted = prediction[fields.predicted];
      const actual = actualForTarget(cortex, targetType);
      if (predicted == null || actual == null) continue;

      const absErr = Math.abs(predicted - actual);
      await prisma.predictionValidation.upsert({
        where: {
          userId_modelVersion_predictionDate_targetType: {
            userId,
            modelVersion: prediction.modelVersion,
            predictionDate: prediction.predictionDate,
            targetType,
          },
        },
        create: {
          userId,
          modelVersion: prediction.modelVersion,
          predictionDate: prediction.predictionDate,
          targetType,
          predictedValue: predicted,
          actualValue: actual,
          absoluteError: absErr,
          percentageError: pctError(predicted, actual),
        },
        update: {
          predictedValue: predicted,
          actualValue: actual,
          absoluteError: absErr,
          percentageError: pctError(predicted, actual),
        },
      });

      actualUpdates[fields.actualPrediction] = actual;
      validated += 1;
    }

    if (Object.keys(actualUpdates).length > 0) {
      await prisma.performancePrediction.update({
        where: { id: prediction.id },
        data: actualUpdates,
      });
    }
  }

  const metricsUpdated = await recomputeValidationMetrics(userId);
  return { validated, metrics_updated: metricsUpdated };
}

function baselineValuesForDate(
  targetType: TargetType,
  date: string,
  cortexByDate: Map<string, { attentionScore: number | null; deepWorkMinutes: number | null; outputScore: number | null }>,
  readinessByDate: Map<string, number>,
): { yesterday: number | null; rolling7: number | null; readiness: number | null } {
  const yesterdayKey = addDaysKey(date, -1);
  const yesterdayRow = cortexByDate.get(yesterdayKey);
  const yesterday = yesterdayRow ? actualForTarget(yesterdayRow, targetType) : null;

  const rolling: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const row = cortexByDate.get(addDaysKey(date, -i));
    const v = row ? actualForTarget(row, targetType) : null;
    if (v != null) rolling.push(v);
  }
  const rolling7 = rolling.length ? rolling.reduce((s, v) => s + v, 0) / rolling.length : null;

  const readiness = readinessByDate.get(yesterdayKey) ?? null;

  return { yesterday, rolling7, readiness };
}

export async function recomputeValidationMetrics(userId: string): Promise<number> {
  const modelVersions = await prisma.predictionValidation.findMany({
    where: { userId },
    distinct: ['modelVersion'],
    select: { modelVersion: true },
  });

  if (modelVersions.length === 0) return 0;

  const cortexByDate = await loadCortexByDate(userId);
  const readinessByDate = await loadReadinessByDate(userId);
  let updated = 0;

  for (const { modelVersion } of modelVersions) {
    const validations = await prisma.predictionValidation.findMany({
      where: { userId, modelVersion },
      orderBy: { predictionDate: 'asc' },
    });

    if (validations.length === 0) continue;

    const rangeStart = validations[0]!.predictionDate;
    const rangeEnd = validations[validations.length - 1]!.predictionDate;

    for (const targetType of TARGET_TYPES) {
      const subset = validations.filter((v) => v.targetType === targetType);
      if (subset.length === 0) continue;

      const errors = subset.map((v) => v.absoluteError);
      const predicted = subset.map((v) => v.predictedValue);
      const actual = subset.map((v) => v.actualValue);

      const yesterdayErrors: number[] = [];
      const rolling7Errors: number[] = [];
      const readinessErrors: number[] = [];

      for (const row of subset) {
        const key = dateKey(row.predictionDate);
        const baselines = baselineValuesForDate(
          targetType,
          key,
          cortexByDate,
          readinessByDate,
        );
        if (baselines.yesterday != null) {
          yesterdayErrors.push(Math.abs(baselines.yesterday - row.actualValue));
        }
        if (baselines.rolling7 != null) {
          rolling7Errors.push(Math.abs(baselines.rolling7 - row.actualValue));
        }
        if (baselines.readiness != null) {
          readinessErrors.push(Math.abs(baselines.readiness - row.actualValue));
        }
      }

      const modelMae = mae(errors);
      const baselineMae = {
        yesterday: yesterdayErrors.length ? mae(yesterdayErrors) : null,
        rolling7: rolling7Errors.length ? mae(rolling7Errors) : null,
        readiness: readinessErrors.length ? mae(readinessErrors) : null,
      };

      const beatsBaselines =
        (baselineMae.yesterday == null || modelMae <= baselineMae.yesterday) &&
        (baselineMae.rolling7 == null || modelMae <= baselineMae.rolling7) &&
        (baselineMae.readiness == null || modelMae <= baselineMae.readiness);

      await prisma.validationMetric.upsert({
        where: {
          userId_modelVersion_targetType_dateRangeStart_dateRangeEnd: {
            userId,
            modelVersion,
            targetType,
            dateRangeStart: rangeStart,
            dateRangeEnd: rangeEnd,
          },
        },
        create: {
          userId,
          modelVersion,
          targetType,
          dateRangeStart: rangeStart,
          dateRangeEnd: rangeEnd,
          mae: Math.round(modelMae * 100) / 100,
          rmse: Math.round(rmse(errors) * 100) / 100,
          correlation: pearson(predicted, actual),
          beatsBaselines,
          baselineMae,
          sampleCount: subset.length,
        },
        update: {
          mae: Math.round(modelMae * 100) / 100,
          rmse: Math.round(rmse(errors) * 100) / 100,
          correlation: pearson(predicted, actual),
          beatsBaselines,
          baselineMae,
          sampleCount: subset.length,
          computedAt: new Date(),
        },
      });
      updated += 1;
    }
  }

  return updated;
}

function trendLabel(recent: number[], prior: number[]): 'improving' | 'declining' | 'stable' | 'insufficient_data' {
  if (recent.length < 3 || prior.length < 3) return 'insufficient_data';
  const recentMae = mae(recent);
  const priorMae = mae(prior);
  const delta = recentMae - priorMae;
  if (Math.abs(delta) < 0.5) return 'stable';
  return delta < 0 ? 'improving' : 'declining';
}

export async function getValidationSummary(userId: string) {
  const latestRun = await prisma.modelRun.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  const modelVersion = latestRun?.modelVersion ?? 'xgb-v1';

  const metrics = await prisma.validationMetric.findMany({
    where: { userId, modelVersion },
    orderBy: { targetType: 'asc' },
  });

  const validations = await prisma.predictionValidation.findMany({
    where: { userId, modelVersion },
    orderBy: { predictionDate: 'asc' },
  });

  const targets: Record<string, unknown> = {};
  let mlAddsValue = true;

  for (const targetType of TARGET_TYPES) {
    const metric = metrics.find((m) => m.targetType === targetType);
    const subset = validations.filter((v) => v.targetType === targetType);
    const recent = subset.slice(-7).map((v) => v.absoluteError);
    const prior = subset.slice(-14, -7).map((v) => v.absoluteError);

    if (metric) {
      if (!metric.beatsBaselines) mlAddsValue = false;
      targets[targetType] = {
        mae: metric.mae,
        rmse: metric.rmse,
        correlation: metric.correlation,
        beats_baselines: metric.beatsBaselines,
        sample_count: metric.sampleCount,
        trend: trendLabel(recent, prior),
        baseline_mae: metric.baselineMae,
      };
    } else {
      mlAddsValue = false;
      targets[targetType] = null;
    }
  }

  return {
    model_version: modelVersion,
    validated_days: new Set(validations.map((v) => dateKey(v.predictionDate))).size,
    total_validations: validations.length,
    targets,
    ml_adds_value: mlAddsValue && validations.length > 0,
    date_range:
      validations.length > 0
        ? {
            start: dateKey(validations[0]!.predictionDate),
            end: dateKey(validations[validations.length - 1]!.predictionDate),
          }
        : null,
  };
}

export async function getValidationHistory(
  userId: string,
  options: { target?: TargetType; limit?: number } = {},
) {
  const limit = Math.min(options.limit ?? 90, 365);
  const where: { userId: string; targetType?: string } = { userId };
  if (options.target) where.targetType = options.target;

  const rows = await prisma.predictionValidation.findMany({
    where,
    orderBy: { predictionDate: 'desc' },
    take: limit,
  });

  const byDate = new Map<string, { date: string; targets: Record<string, unknown> }>();

  for (const row of rows) {
    const key = dateKey(row.predictionDate);
    if (!byDate.has(key)) {
      byDate.set(key, { date: key, targets: {} });
    }
    byDate.get(key)!.targets[row.targetType] = {
      predicted_value: row.predictedValue,
      actual_value: row.actualValue,
      absolute_error: row.absoluteError,
      percentage_error: row.percentageError,
      model_version: row.modelVersion,
    };
  }

  const accuracyOverTime = [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => {
      const errors = Object.values(day.targets).map(
        (t) => (t as { absolute_error: number }).absolute_error,
      );
      return {
        date: day.date,
        mean_absolute_error: errors.length ? Math.round(mae(errors) * 100) / 100 : null,
        targets: day.targets,
      };
    });

  return {
    history: rows.map((r) => ({
      prediction_date: dateKey(r.predictionDate),
      target_type: r.targetType,
      predicted_value: r.predictedValue,
      actual_value: r.actualValue,
      absolute_error: r.absoluteError,
      percentage_error: r.percentageError,
      model_version: r.modelVersion,
    })),
    accuracy_over_time: accuracyOverTime,
  };
}

export async function getValidationFeatures(userId: string) {
  const run = await prisma.modelRun.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!run) {
    return {
      model_version: null,
      feature_importance: {},
      baseline_comparison: {},
      beats_baselines: false,
    };
  }

  const importance = run.featureImportance as Record<
    string,
    Array<{ feature: string; weight?: number; importance?: number }> | Record<string, number>
  >;

  const normalized: Record<string, Array<{ feature: string; importance: number }>> = {};

  for (const [target, value] of Object.entries(importance)) {
    if (Array.isArray(value)) {
      normalized[target] = value.map((item) => ({
        feature: item.feature,
        importance: Math.round((item.weight ?? item.importance ?? 0) * 1000) / 1000,
      }));
    } else if (value && typeof value === 'object') {
      normalized[target] = Object.entries(value).map(([feature, imp]) => ({
        feature,
        importance: Math.round(Number(imp) * 1000) / 1000,
      }));
    }
  }

  const validationMetrics = await prisma.validationMetric.findMany({
    where: { userId, modelVersion: run.modelVersion },
  });

  const baselineComparison: Record<string, unknown> = {};
  for (const metric of validationMetrics) {
    baselineComparison[metric.targetType] = {
      model_mae: metric.mae,
      ...(metric.baselineMae as Record<string, number>),
      beats_baselines: metric.beatsBaselines,
    };
  }

  return {
    model_version: run.modelVersion,
    training_period: {
      start: dateKey(run.trainingStart),
      end: dateKey(run.trainingEnd),
    },
    feature_importance: normalized,
    training_feature_importance: run.featureImportance,
    baseline_comparison: baselineComparison,
    training_baseline_comparison: run.baselineComparison,
    beats_baselines: run.beatsBaselines,
    sample_count: run.sampleCount,
  };
}
