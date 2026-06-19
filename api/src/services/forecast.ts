import { DateTime } from 'luxon';

import { prisma } from '../lib/prisma.js';
import {
  computeCognitiveWindows,
  type HourlyScore,
} from './cognitive-windows.js';
import { getTomorrowPrediction } from './ml.js';

export const FORECAST_VERSION = 'forecast-v1';

export type ForecastResult = {
  date: string;
  hourly_forecast: HourlyScore[];
  best_deep_work_window: { start: string; end: string } | null;
  best_meeting_window: { start: string; end: string } | null;
  recovery_window: { start: string; end: string } | null;
  daily_prediction: {
    predicted_attention: number | null;
    predicted_deep_work: number | null;
    predicted_output: number | null;
    confidence: number | null;
  } | null;
  version: string;
};

function scaleCurveToTarget(
  curve: HourlyScore[],
  targetAttention: number | null,
): HourlyScore[] {
  if (!targetAttention || curve.length === 0) return curve;

  const currentAvg =
    curve.reduce((s, p) => s + p.score, 0) / curve.length;
  if (currentAvg === 0) return curve;

  const scale = targetAttention / currentAvg;

  return curve.map((p) => ({
    hour: p.hour,
    score: Math.max(15, Math.min(98, Math.round(p.score * scale))),
  }));
}

export async function generateForecast(
  userId: string,
  dateKey: string,
  timezone: string,
): Promise<ForecastResult> {
  const windows = await computeCognitiveWindows(userId, dateKey, timezone);

  let prediction = null;
  try {
    prediction = await getTomorrowPrediction(userId, timezone);
  } catch {
    prediction = null;
  }

  const targetAttention = prediction?.predicted_attention ?? null;
  const hourlyForecast = scaleCurveToTarget(
    windows.hourly_curve,
    targetAttention,
  );

  await prisma.cognitiveWindow.update({
    where: {
      userId_date: {
        userId,
        date: new Date(`${dateKey}T00:00:00.000Z`),
      },
    },
    data: { hourlyCurve: hourlyForecast },
  });

  return {
    date: dateKey,
    hourly_forecast: hourlyForecast,
    best_deep_work_window: windows.peak_window,
    best_meeting_window: windows.meeting_window,
    recovery_window: windows.recovery_window,
    daily_prediction: prediction
      ? {
          predicted_attention: prediction.predicted_attention,
          predicted_deep_work: prediction.predicted_deep_work,
          predicted_output: prediction.predicted_output,
          confidence: prediction.confidence,
        }
      : null,
    version: FORECAST_VERSION,
  };
}

export async function getTodayForecast(
  userId: string,
  timezone: string,
): Promise<ForecastResult> {
  const dateKey = DateTime.now().setZone(timezone).toISODate()!;
  return generateForecast(userId, dateKey, timezone);
}
