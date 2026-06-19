import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

import { DateTime } from 'luxon';

import { prisma } from '../lib/prisma.js';
import { toDateOnly } from '../lib/timezone.js';
import { parseChronotypeEstimate } from './chronotype.js';
import { getTrainingDataset } from './cortex.js';

const execFileAsync = promisify(execFile);

const ML_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../ml');
const MODEL_VERSION = 'xgb-v1';

export type PerformancePredictionResult = {
  predicted_attention: number | null;
  predicted_deep_work: number | null;
  predicted_output: number | null;
  confidence: number;
  model_version: string;
  validated: boolean;
};

type TrainingRow = {
  date: Date;
  sleep_duration: unknown;
  sleep_efficiency: unknown;
  avg_hrv: unknown;
  hrv_vs_baseline_pct: unknown;
  resting_hr: unknown;
  steps: unknown;
  exercise_minutes: unknown;
  readiness_score: unknown;
  weekday: unknown;
  chronotype_classification: string | null;
  deep_work_minutes: unknown;
  attention_score: unknown;
  output_score: unknown;
};

function toNum(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function targetValue(row: TrainingRow, key: keyof TrainingRow): number | null {
  const raw = row[key];
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const FEATURE_KEYS = [
  'sleep_duration',
  'sleep_efficiency',
  'avg_hrv',
  'hrv_vs_baseline_pct',
  'resting_hr',
  'steps',
  'exercise_minutes',
  'readiness_score',
  'weekday',
] as const;

const TARGETS = [
  { key: 'attention_score' as const, out: 'attention' as const },
  { key: 'deep_work_minutes' as const, out: 'deep_work' as const },
  { key: 'output_score' as const, out: 'output' as const },
];

const CHRONOTYPE_ENC: Record<string, number> = {
  morning_lark: 0,
  moderate_morning: 1,
  neutral: 2,
  moderate_evening: 3,
  night_owl: 4,
};

function rowToFeatures(row: TrainingRow): number[] {
  const chrono =
    CHRONOTYPE_ENC[row.chronotype_classification ?? 'neutral'] ?? 2;
  return [
    toNum(row.sleep_duration, 7),
    toNum(row.sleep_efficiency, 0.85),
    toNum(row.avg_hrv, 55),
    toNum(row.hrv_vs_baseline_pct, 0),
    toNum(row.resting_hr, 60),
    toNum(row.steps, 7000),
    toNum(row.exercise_minutes, 30),
    toNum(row.readiness_score, 70),
    toNum(row.weekday, 0),
    chrono,
  ];
}

function mae(actual: number[], predicted: number[]): number {
  if (actual.length === 0) return Infinity;
  return (
    actual.reduce((s, a, i) => s + Math.abs(a - predicted[i]!), 0) / actual.length
  );
}

function rmse(actual: number[], predicted: number[]): number {
  if (actual.length === 0) return Infinity;
  const mse =
    actual.reduce((s, a, i) => s + (a - predicted[i]!) ** 2, 0) / actual.length;
  return Math.sqrt(mse);
}

type RidgeModel = {
  weights: number[];
  bias: number;
  featureNames: string[];
  mean: number[];
  std: number[];
};

function standardizeMatrix(X: number[][]): {
  scaled: number[][];
  mean: number[];
  std: number[];
} {
  const m = X[0]!.length;
  const n = X.length;
  const mean = Array.from({ length: m }, (_, j) =>
    X.reduce((s, row) => s + row[j]!, 0) / n,
  );
  const std = Array.from({ length: m }, (_, j) => {
    const mu = mean[j]!;
    const variance = X.reduce((s, row) => s + (row[j]! - mu) ** 2, 0) / n;
    return Math.sqrt(variance) || 1;
  });
  const scaled = X.map((row) =>
    row.map((value, j) => (value - mean[j]!) / std[j]!),
  );
  return { scaled, mean, std };
}

function scaleFeatures(x: number[], mean: number[], std: number[]): number[] {
  return x.map((value, j) => (value - mean[j]!) / std[j]!);
}

function trainRidge(
  X: number[][],
  y: number[],
  lambda = 1,
): RidgeModel | null {
  if (X.length < 10) return null;

  const { scaled, mean, std } = standardizeMatrix(X);
  const n = scaled.length;
  const m = scaled[0]!.length;
  const weights = Array(m).fill(0);
  let bias = y.reduce((s, v) => s + v, 0) / n;

  const lr = 0.01;
  for (let epoch = 0; epoch < 1500; epoch++) {
    const gradW = Array(m).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      const pred =
        bias + weights.reduce((s, w, j) => s + w * scaled[i]![j]!, 0);
      const err = pred - y[i]!;
      gradB += err;
      for (let j = 0; j < m; j++) {
        gradW[j]! += err * scaled[i]![j]!;
      }
    }

    bias -= (lr * gradB) / n;
    for (let j = 0; j < m; j++) {
      weights[j]! -= (lr * (gradW[j]! / n + lambda * weights[j]!));
    }
  }

  return {
    weights,
    bias,
    featureNames: [...FEATURE_KEYS, 'chronotype'],
    mean,
    std,
  };
}

function predictRidge(model: RidgeModel, x: number[]): number {
  const scaled = scaleFeatures(x, model.mean, model.std);
  const pred =
    model.bias + model.weights.reduce((s, w, j) => s + w * scaled[j]!, 0);
  if (!Number.isFinite(pred)) return 0;
  return Math.round(pred * 100) / 100;
}

async function trainTypeScriptModels(userId: string) {
  const raw = (await getTrainingDataset(userId)) as TrainingRow[];
  const rows = raw.filter(
    (r) =>
      targetValue(r, 'attention_score') != null ||
      targetValue(r, 'deep_work_minutes') != null ||
      targetValue(r, 'output_score') != null,
  );

  if (rows.length < 21) {
    throw new Error(`INSUFFICIENT_DATA: need 21+ days, have ${rows.length}`);
  }

  const holdout = rows.slice(-7);
  const train = rows.slice(0, -7);

  const models: Record<string, RidgeModel> = {};
  const maeScores: Record<string, number> = {};
  const rmseScores: Record<string, number> = {};
  const baselineComparison: Record<string, Record<string, number>> = {};

  for (const target of TARGETS) {
    const aligned = train.filter((r) => targetValue(r, target.key) != null);
    const trainY = aligned.map((r) => targetValue(r, target.key)!);
    if (trainY.length < 10) continue;

    const alignedX = aligned.map(rowToFeatures);
    const model = trainRidge(alignedX, trainY);
    if (!model) continue;
    models[target.out] = model;

    const testRows = holdout.filter((r) => targetValue(r, target.key) != null);
    const actual = testRows.map((r) => targetValue(r, target.key)!);
    const predicted = testRows.map((r) => predictRidge(model, rowToFeatures(r)));

    const yesterdayBaseline = holdout.map((r, i) => {
      const key = target.key;
      if (i > 0) return targetValue(holdout[i - 1]!, key) ?? actual[i]!;
      return actual[i]!;
    });
    const rolling7 = holdout.map((_, i) => {
      const slice = rows.slice(-7 - holdout.length + i, rows.length - holdout.length + i);
      const vals = slice
        .map((r) => targetValue(r, target.key))
        .filter((v): v is number => v != null);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : actual[i]!;
    });
    const readinessBaseline = holdout.map((r) => toNum(r.readiness_score, 70));

    maeScores[target.out] = mae(actual, predicted);
    rmseScores[target.out] = rmse(actual, predicted);

    baselineComparison[target.out] = {
      model_mae: mae(actual, predicted),
      yesterday_mae: mae(actual, yesterdayBaseline),
      rolling7_mae: mae(actual, rolling7),
      readiness_mae: mae(actual, readinessBaseline),
    };
  }

  const beatsBaselines = Object.values(baselineComparison).every(
    (b) =>
      b.model_mae <= b.yesterday_mae &&
      b.model_mae <= b.rolling7_mae &&
      b.model_mae <= b.readiness_mae,
  );

  const trainingStart = train[0]!.date;
  const trainingEnd = train[train.length - 1]!.date;

  await prisma.modelRun.create({
    data: {
      userId,
      modelVersion: MODEL_VERSION,
      trainingStart,
      trainingEnd,
      status: beatsBaselines ? 'validated' : 'below_baseline',
      mae: maeScores,
      rmse: rmseScores,
      featureImportance: Object.fromEntries(
        Object.entries(models).map(([name, m]) => [
          name,
          m.featureNames.map((f, i) => ({
            feature: f,
            weight: Math.abs(m.weights[i]!),
          })),
        ]),
      ),
      baselineComparison,
      beatsBaselines,
      sampleCount: rows.length,
    },
  });

  return { models, beatsBaselines, sampleCount: rows.length };
}

export async function trainModels(userId: string): Promise<{
  method: string;
  beats_baselines: boolean;
  sample_count: number;
}> {
  const pythonScript = join(ML_DIR, 'train.py');
  if (existsSync(pythonScript)) {
    try {
      const { stdout } = await execFileAsync(
        'python3',
        [pythonScript, '--user-id', userId],
        {
          env: { ...process.env },
          cwd: ML_DIR,
          timeout: 120_000,
        },
      );
      const result = JSON.parse(stdout.trim());
      return {
        method: 'xgboost',
        beats_baselines: result.beats_baselines,
        sample_count: result.sample_count,
      };
    } catch {
      // fall through to TypeScript trainer
    }
  }

  const result = await trainTypeScriptModels(userId);
  return {
    method: 'ridge-fallback',
    beats_baselines: result.beatsBaselines,
    sample_count: result.sampleCount,
  };
}

async function loadLatestModels(userId: string): Promise<{
  models: Record<string, RidgeModel>;
  run: { beatsBaselines: boolean; sampleCount: number };
} | null> {
  const run = await prisma.modelRun.findFirst({
    where: { userId, modelVersion: MODEL_VERSION },
    orderBy: { createdAt: 'desc' },
  });

  if (!run) return null;

  const raw = (await getTrainingDataset(userId)) as TrainingRow[];
  const rows = raw.filter(
    (r) =>
      targetValue(r, 'attention_score') != null ||
      targetValue(r, 'deep_work_minutes') != null,
  );
  if (rows.length < 21) return null;

  const train = rows.slice(0, -7);
  const models: Record<string, RidgeModel> = {};

  for (const target of TARGETS) {
    const aligned = train.filter((r) => targetValue(r, target.key) != null);
    const model = trainRidge(
      aligned.map(rowToFeatures),
      aligned.map((r) => targetValue(r, target.key)!),
    );
    if (model) models[target.out] = model;
  }

  return { models, run: { beatsBaselines: run.beatsBaselines, sampleCount: run.sampleCount } };
}

async function buildFeatureVectorForDate(
  userId: string,
  dateKey: string,
): Promise<number[] | null> {
  const date = toDateOnly(DateTime.fromISO(dateKey, { zone: 'utc' }));
  const [feature, user] = await Promise.all([
    prisma.dailyFeature.findUnique({ where: { userId_date: { userId, date } } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!feature) return null;

  const chrono = parseChronotypeEstimate(user?.chronotypeEstimate ?? null);

  return rowToFeatures({
    date: feature.date,
    sleep_duration: feature.sleepDuration,
    sleep_efficiency: feature.sleepEfficiency,
    avg_hrv: feature.avgHrv,
    hrv_vs_baseline_pct: feature.hrvVsBaselinePct,
    resting_hr: feature.restingHr,
    steps: feature.steps,
    exercise_minutes: feature.exerciseMinutes,
    readiness_score: feature.readinessScore,
    weekday: feature.date.getUTCDay(),
    chronotype_classification: chrono?.classification ?? null,
    deep_work_minutes: null,
    attention_score: null,
    output_score: null,
  });
}

export async function getTomorrowPrediction(
  userId: string,
  timezone: string,
): Promise<PerformancePredictionResult | null> {
  const tomorrow = DateTime.now()
    .setZone(timezone)
    .plus({ days: 1 })
    .toISODate()!;

  const existing = await prisma.performancePrediction.findUnique({
    where: {
      userId_predictionDate_modelVersion: {
        userId,
        predictionDate: toDateOnly(DateTime.fromISO(tomorrow, { zone: 'utc' })),
        modelVersion: MODEL_VERSION,
      },
    },
  });

  if (existing) {
    const run = await prisma.modelRun.findFirst({
      where: { userId, modelVersion: MODEL_VERSION },
      orderBy: { createdAt: 'desc' },
    });
    return {
      predicted_attention: existing.predictedAttention,
      predicted_deep_work: existing.predictedDeepWorkMinutes,
      predicted_output: existing.predictedOutputScore,
      confidence: existing.confidence ?? 0.5,
      model_version: existing.modelVersion,
      validated: run?.beatsBaselines ?? false,
    };
  }

  const loaded = await loadLatestModels(userId);
  if (!loaded) return null;

  const todayKey = DateTime.now().setZone(timezone).toISODate()!;
  const features = await buildFeatureVectorForDate(userId, todayKey);
  if (!features) return null;

  const { models } = loaded;
  if (Object.keys(models).length === 0) return null;

  const predictedAttention = models.attention
    ? Math.min(100, Math.max(0, predictRidge(models.attention, features)))
    : null;
  const predictedDeepWork = models.deep_work
    ? Math.max(0, predictRidge(models.deep_work, features))
    : null;
  const predictedOutput = models.output
    ? Math.min(100, Math.max(0, predictRidge(models.output, features)))
    : null;

  const confidence = Math.min(0.95, loaded.run.sampleCount / 60);

  const predictionDate = toDateOnly(DateTime.fromISO(tomorrow, { zone: 'utc' }));

  await prisma.performancePrediction.upsert({
    where: {
      userId_predictionDate_modelVersion: {
        userId,
        predictionDate,
        modelVersion: MODEL_VERSION,
      },
    },
    create: {
      userId,
      predictionDate,
      predictedAttention,
      predictedDeepWorkMinutes: predictedDeepWork,
      predictedOutputScore: predictedOutput,
      confidence,
      modelVersion: MODEL_VERSION,
      featureSnapshot: { features: FEATURE_KEYS, date: todayKey },
    },
    update: {
      predictedAttention,
      predictedDeepWorkMinutes: predictedDeepWork,
      predictedOutputScore: predictedOutput,
      confidence,
      featureSnapshot: { features: FEATURE_KEYS, date: todayKey },
    },
  });

  return {
    predicted_attention: predictedAttention,
    predicted_deep_work: predictedDeepWork,
    predicted_output: predictedOutput,
    confidence,
    model_version: MODEL_VERSION,
    validated: loaded.run.beatsBaselines,
  };
}
