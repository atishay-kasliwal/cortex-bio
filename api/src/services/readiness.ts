import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { getBaselines } from './feature-engine.js';
import { parseChronotypeEstimate } from './chronotype.js';

export type ReadinessContributor = {
  factor: string;
  impact: string;
  direction: 'positive' | 'negative' | 'neutral';
};

export type ReadinessResult = {
  date: string;
  readiness_score: number;
  contributors: ReadinessContributor[];
  engine_version: string;
  daily_features: {
    sleep_duration: number | null;
    avg_hrv: number | null;
    hrv_vs_baseline_pct: number | null;
    resting_hr: number | null;
    steps: number | null;
  };
};

const ENGINE_VERSION = 'rules-v1';

export async function computeReadiness(
  userId: string,
  dateKey: string,
): Promise<ReadinessResult | null> {
  const date = new Date(`${dateKey}T00:00:00.000Z`);

  const [feature, baselines, user] = await Promise.all([
    prisma.dailyFeature.findUnique({ where: { userId_date: { userId, date } } }),
    getBaselines(userId),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (!feature) return null;

  let score = 70;
  const contributors: ReadinessContributor[] = [];

  if (feature.sleepDuration != null) {
    if (feature.sleepDuration >= 7.5) {
      score += 12;
      contributors.push({ factor: 'Strong sleep', impact: '+12', direction: 'positive' });
    } else if (feature.sleepDuration >= 7.0) {
      score += 6;
      contributors.push({ factor: 'Adequate sleep', impact: '+6', direction: 'positive' });
    } else if (feature.sleepDuration < 6.0) {
      score -= 15;
      contributors.push({ factor: 'Short sleep', impact: '-15', direction: 'negative' });
    } else if (feature.sleepDuration < 6.5) {
      score -= 8;
      contributors.push({ factor: 'Below-target sleep', impact: '-8', direction: 'negative' });
    }
  } else {
    contributors.push({ factor: 'Sleep data missing', impact: '0', direction: 'neutral' });
  }

  if (feature.hrvVsBaselinePct != null) {
    if (feature.hrvVsBaselinePct >= 10) {
      score += 15;
      contributors.push({ factor: 'HRV above baseline', impact: '+15', direction: 'positive' });
    } else if (feature.hrvVsBaselinePct <= -10) {
      score -= 12;
      contributors.push({ factor: 'HRV below baseline', impact: '-12', direction: 'negative' });
    }
  } else if (feature.avgHrv != null && baselines?.hrv_baseline_30d) {
    const delta =
      ((feature.avgHrv - baselines.hrv_baseline_30d) / baselines.hrv_baseline_30d) * 100;
    if (delta >= 10) {
      score += 12;
      contributors.push({ factor: 'HRV above baseline', impact: '+12', direction: 'positive' });
    } else if (delta <= -10) {
      score -= 10;
      contributors.push({ factor: 'HRV below baseline', impact: '-10', direction: 'negative' });
    }
  }

  if (
    feature.restingHr != null &&
    baselines?.resting_hr_baseline_30d != null &&
    feature.restingHr > baselines.resting_hr_baseline_30d + 3
  ) {
    score -= 8;
    contributors.push({
      factor: 'Elevated resting heart rate',
      impact: '-8',
      direction: 'negative',
    });
  }

  if (feature.exerciseMinutes != null && feature.exerciseMinutes >= 60) {
    score -= 5;
    contributors.push({ factor: 'High training load', impact: '-5', direction: 'negative' });
  }

  if (
    feature.steps != null &&
    baselines?.steps_baseline_30d != null &&
    feature.steps >= baselines.steps_baseline_30d * 1.1
  ) {
    score += 4;
    contributors.push({ factor: 'Active yesterday', impact: '+4', direction: 'positive' });
  }

  const chronotype = parseChronotypeEstimate(user?.chronotypeEstimate ?? null);
  if (chronotype?.classification === 'morning_lark') {
    score += 3;
    contributors.push({ factor: 'Morning chronotype', impact: '+3', direction: 'positive' });
  }

  score = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  await prisma.dailyFeature.update({
    where: { userId_date: { userId, date } },
    data: { readinessScore: score },
  });

  return {
    date: dateKey,
    readiness_score: score,
    contributors,
    engine_version: ENGINE_VERSION,
    daily_features: {
      sleep_duration: feature.sleepDuration,
      avg_hrv: feature.avgHrv,
      hrv_vs_baseline_pct: feature.hrvVsBaselinePct,
      resting_hr: feature.restingHr,
      steps: feature.steps,
    },
  };
}

export async function getTodayReadiness(userId: string, timezone: string) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  return computeReadiness(userId, today);
}

export async function getReadinessHistory(
  userId: string,
  timezone: string,
  days = 30,
): Promise<Array<{ date: string; readiness_score: number }>> {
  const limit = Math.min(Math.max(days, 1), 90);
  const rows = await prisma.dailyFeature.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
    select: { date: true, readinessScore: true },
  });

  const history: Array<{ date: string; readiness_score: number }> = [];

  for (const row of rows.reverse()) {
    const dateKey = row.date.toISOString().slice(0, 10);
    if (row.readinessScore != null) {
      history.push({ date: dateKey, readiness_score: row.readinessScore });
      continue;
    }
    const computed = await computeReadiness(userId, dateKey);
    if (computed) {
      history.push({ date: dateKey, readiness_score: computed.readiness_score });
    }
  }

  return history;
}
