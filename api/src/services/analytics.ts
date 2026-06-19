import { DateTime } from 'luxon';

import { prisma } from '../lib/prisma.js';
import { InsightType } from '@cortex-bio/db';

import { toInputJson } from '../lib/json.js';

export const MIN_CORRELATION_DAYS = 14;
export const MIN_HOUR_SAMPLES = 8;
export const MIN_QUARTILE_SAMPLES = 6;

export type CorrelationPair = {
  feature: string;
  featureLabel: string;
  outcome: string;
  outcomeLabel: string;
  correlation: number;
  sampleCount: number;
  sufficient: boolean;
};

export type JoinedDay = {
  date: Date;
  sleepDuration: number | null;
  sleepEfficiency: number | null;
  avgHrv: number | null;
  hrvVsBaselinePct: number | null;
  restingHr: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  productivityScore: number;
  energyScore: number;
  focusScore: number;
  moodScore: number;
  wakeHour: number | null;
};

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return null;
  return num / den;
}

async function loadJoinedDays(userId: string, timezone: string): Promise<JoinedDay[]> {
  const labels = await prisma.dailyLabel.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  if (labels.length === 0) return [];

  const dates = labels.map((l) => l.date);
  const minDate = dates[0]!;
  const maxDate = dates[dates.length - 1]!;

  const [features, sleepSessions] = await Promise.all([
    prisma.dailyFeature.findMany({
      where: { userId, date: { gte: minDate, lte: maxDate } },
    }),
    prisma.sleepSession.findMany({
      where: {
        userId,
        sleepEnd: {
          gte: minDate,
          lte: DateTime.fromJSDate(maxDate).plus({ days: 1 }).toJSDate(),
        },
      },
    }),
  ]);

  const featureByDate = new Map(
    features.map((f) => [f.date.toISOString().slice(0, 10), f]),
  );

  const wakeHourByDate = new Map<string, number>();
  for (const session of sleepSessions) {
    const dateKey = DateTime.fromJSDate(session.sleepEnd, { zone: 'utc' })
      .setZone(timezone)
      .toISODate()!;
    const hour = DateTime.fromJSDate(session.sleepEnd, { zone: 'utc' })
      .setZone(timezone).hour +
      DateTime.fromJSDate(session.sleepEnd, { zone: 'utc' })
        .setZone(timezone).minute / 60;
    const existing = wakeHourByDate.get(dateKey);
    if (existing == null || hour > existing) {
      wakeHourByDate.set(dateKey, hour);
    }
  }

  return labels.map((label) => {
    const dateKey = label.date.toISOString().slice(0, 10);
    const feature = featureByDate.get(dateKey);
    return {
      date: label.date,
      sleepDuration: feature?.sleepDuration ?? null,
      sleepEfficiency: feature?.sleepEfficiency ?? null,
      avgHrv: feature?.avgHrv ?? null,
      hrvVsBaselinePct: feature?.hrvVsBaselinePct ?? null,
      restingHr: feature?.restingHr ?? null,
      steps: feature?.steps ?? null,
      exerciseMinutes: feature?.exerciseMinutes ?? null,
      productivityScore: label.productivityScore,
      energyScore: label.energyScore,
      focusScore: label.focusScore,
      moodScore: label.moodScore,
      wakeHour: wakeHourByDate.get(dateKey) ?? null,
    };
  });
}

const CORRELATION_PAIRS: Array<{
  feature: keyof JoinedDay;
  featureLabel: string;
  outcome: keyof JoinedDay;
  outcomeLabel: string;
}> = [
  { feature: 'sleepDuration', featureLabel: 'Sleep Duration', outcome: 'productivityScore', outcomeLabel: 'Productivity' },
  { feature: 'sleepDuration', featureLabel: 'Sleep Duration', outcome: 'focusScore', outcomeLabel: 'Focus' },
  { feature: 'sleepDuration', featureLabel: 'Sleep Duration', outcome: 'energyScore', outcomeLabel: 'Energy' },
  { feature: 'avgHrv', featureLabel: 'HRV', outcome: 'focusScore', outcomeLabel: 'Focus' },
  { feature: 'avgHrv', featureLabel: 'HRV', outcome: 'energyScore', outcomeLabel: 'Energy' },
  { feature: 'hrvVsBaselinePct', featureLabel: 'HRV vs Baseline', outcome: 'focusScore', outcomeLabel: 'Focus' },
  { feature: 'steps', featureLabel: 'Steps', outcome: 'energyScore', outcomeLabel: 'Energy' },
  { feature: 'restingHr', featureLabel: 'Resting HR', outcome: 'focusScore', outcomeLabel: 'Focus' },
  { feature: 'wakeHour', featureLabel: 'Wake Time', outcome: 'productivityScore', outcomeLabel: 'Productivity' },
  { feature: 'exerciseMinutes', featureLabel: 'Exercise', outcome: 'energyScore', outcomeLabel: 'Energy' },
];

export async function computeCorrelations(
  userId: string,
  timezone: string,
): Promise<CorrelationPair[]> {
  const days = await loadJoinedDays(userId, timezone);

  return CORRELATION_PAIRS.map((pair) => {
    const xs: number[] = [];
    const ys: number[] = [];

    for (const day of days) {
      const x = day[pair.feature];
      const y = day[pair.outcome];
      if (typeof x === 'number' && typeof y === 'number') {
        xs.push(x);
        ys.push(y);
      }
    }

    const correlation = pearson(xs, ys);
    const sampleCount = xs.length;

    return {
      feature: pair.feature,
      featureLabel: pair.featureLabel,
      outcome: pair.outcome,
      outcomeLabel: pair.outcomeLabel,
      correlation: correlation != null ? Math.round(correlation * 1000) / 1000 : 0,
      sampleCount,
      sufficient: sampleCount >= MIN_CORRELATION_DAYS && correlation != null,
    };
  });
}

function quartileImpact(
  values: number[],
  outcomes: number[],
): { impactPct: number; confidence: number } | null {
  if (values.length < MIN_QUARTILE_SAMPLES * 2) return null;

  const pairs = values.map((v, i) => ({ v, o: outcomes[i]! })).sort((a, b) => a.v - b.v);
  const mid = Math.floor(pairs.length / 2);
  const low = pairs.slice(0, mid);
  const high = pairs.slice(mid);

  if (low.length < MIN_QUARTILE_SAMPLES || high.length < MIN_QUARTILE_SAMPLES) return null;

  const lowAvg = low.reduce((s, p) => s + p.o, 0) / low.length;
  const highAvg = high.reduce((s, p) => s + p.o, 0) / high.length;
  if (lowAvg === 0) return null;

  const impactPct = Math.round(((highAvg - lowAvg) / lowAvg) * 100);
  const confidence = Math.min(1, pairs.length / 30);

  return { impactPct, confidence };
}

function findSleepSweetSpot(days: JoinedDay[]): {
  minHours: number;
  maxHours: number;
  avgProductivity: number;
} | null {
  const withSleep = days.filter(
    (d) => d.sleepDuration != null && d.productivityScore != null,
  );
  if (withSleep.length < MIN_CORRELATION_DAYS) return null;

  const buckets = new Map<string, { sum: number; count: number; min: number; max: number }>();

  for (const day of withSleep) {
    const hours = day.sleepDuration!;
    const bucketStart = Math.floor(hours * 2) / 2;
    const key = `${bucketStart.toFixed(1)}`;
    const bucket = buckets.get(key) ?? { sum: 0, count: 0, min: bucketStart, max: bucketStart + 0.5 };
    bucket.sum += day.productivityScore;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  let best: { minHours: number; maxHours: number; avgProductivity: number } | null = null;

  for (const bucket of buckets.values()) {
    if (bucket.count < 3) continue;
    const avg = bucket.sum / bucket.count;
    if (!best || avg > best.avgProductivity) {
      best = {
        minHours: bucket.min,
        maxHours: bucket.max,
        avgProductivity: Math.round(avg * 100) / 100,
      };
    }
  }

  return best;
}

async function findPeakSessionHours(
  userId: string,
  timezone: string,
): Promise<{ startHour: number; endHour: number; avgQuality: number; sampleCount: number } | null> {
  const sessions = await prisma.workSession.findMany({
    where: { userId, sessionQuality: { not: null }, endedAt: { not: null } },
    select: { startedAt: true, sessionQuality: true },
  });

  if (sessions.length < MIN_HOUR_SAMPLES) return null;

  const qualityScore: Record<string, number> = { poor: 1, average: 2, good: 3, great: 4 };
  const byHour = new Map<number, { sum: number; count: number }>();

  for (const session of sessions) {
    const hour = DateTime.fromJSDate(session.startedAt, { zone: 'utc' })
      .setZone(timezone).hour;
    const score = qualityScore[session.sessionQuality!] ?? 2;
    const bucket = byHour.get(hour) ?? { sum: 0, count: 0 };
    bucket.sum += score;
    bucket.count += 1;
    byHour.set(hour, bucket);
  }

  let bestStart = 9;
  let bestAvg = 0;
  let bestCount = 0;

  for (let start = 6; start <= 18; start++) {
    let sum = 0;
    let count = 0;
    for (let h = start; h < start + 2 && h < 24; h++) {
      const bucket = byHour.get(h);
      if (bucket) {
        sum += bucket.sum;
        count += bucket.count;
      }
    }
    if (count >= MIN_HOUR_SAMPLES) {
      const avg = sum / count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestStart = start;
        bestCount = count;
      }
    }
  }

  if (bestCount < MIN_HOUR_SAMPLES) return null;

  return {
    startHour: bestStart,
    endHour: bestStart + 2,
    avgQuality: Math.round(bestAvg * 100) / 100,
    sampleCount: bestCount,
  };
}

async function findBestProjectType(userId: string): Promise<{
  projectName: string;
  avgQuality: number;
  sessionCount: number;
} | null> {
  const sessions = await prisma.workSession.findMany({
    where: { userId, sessionQuality: { not: null }, projectName: { not: null } },
    select: { projectName: true, sessionQuality: true },
  });

  const qualityScore: Record<string, number> = { poor: 1, average: 2, good: 3, great: 4 };
  const byProject = new Map<string, { sum: number; count: number }>();

  for (const session of sessions) {
    const name = session.projectName!;
    const bucket = byProject.get(name) ?? { sum: 0, count: 0 };
    bucket.sum += qualityScore[session.sessionQuality!] ?? 2;
    bucket.count += 1;
    byProject.set(name, bucket);
  }

  let best: { projectName: string; avgQuality: number; sessionCount: number } | null = null;

  for (const [projectName, bucket] of byProject) {
    if (bucket.count < 5) continue;
    const avg = bucket.sum / bucket.count;
    if (!best || avg > best.avgQuality) {
      best = {
        projectName,
        avgQuality: Math.round(avg * 100) / 100,
        sessionCount: bucket.count,
      };
    }
  }

  return best;
}

export type GeneratedInsight = {
  insightType: InsightType;
  title: string;
  description: string;
  metricName: string;
  impactPct: number | null;
  confidence: number;
  metadata: Record<string, unknown>;
};

export async function generateInsights(
  userId: string,
  timezone: string,
): Promise<GeneratedInsight[]> {
  const days = await loadJoinedDays(userId, timezone);
  const correlations = await computeCorrelations(userId, timezone);
  const insights: GeneratedInsight[] = [];

  const significant = correlations
    .filter((c) => c.sufficient && Math.abs(c.correlation) >= 0.3)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  for (const corr of significant.slice(0, 5)) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const day of days) {
      const x = day[corr.feature as keyof JoinedDay];
      const y = day[corr.outcome as keyof JoinedDay];
      if (typeof x === 'number' && typeof y === 'number') {
        xs.push(x);
        ys.push(y);
      }
    }

    const impact = quartileImpact(xs, ys);
    const direction = corr.correlation > 0 ? 'higher' : 'lower';

    let insightType: InsightType = InsightType.top_driver;
    if (corr.feature.includes('hrv') || corr.feature === 'avgHrv') {
      insightType = InsightType.hrv_impact;
    } else if (corr.feature.includes('sleep')) {
      insightType = InsightType.sleep_impact;
    } else if (corr.feature === 'steps' || corr.feature === 'exerciseMinutes') {
      insightType = InsightType.activity_impact;
    }

    insights.push({
      insightType,
      title: `${corr.featureLabel} ↔ ${corr.outcomeLabel}`,
      description: `${direction === 'higher' ? 'Higher' : 'Lower'} ${corr.featureLabel.toLowerCase()} correlates with ${direction === 'higher' ? 'higher' : 'lower'} ${corr.outcomeLabel.toLowerCase()} (r=${corr.correlation}, n=${corr.sampleCount}).`,
      metricName: corr.feature,
      impactPct: impact?.impactPct ?? null,
      confidence: impact?.confidence ?? corr.sampleCount / 30,
      metadata: { correlation: corr.correlation, sampleCount: corr.sampleCount },
    });
  }

  const sleepSweetSpot = findSleepSweetSpot(days);
  if (sleepSweetSpot) {
    insights.push({
      insightType: InsightType.sleep_impact,
      title: 'Your best days occur after optimal sleep',
      description: `Your highest productivity scores cluster after ${sleepSweetSpot.minHours.toFixed(1)}–${sleepSweetSpot.maxHours.toFixed(1)} hours of sleep (avg score ${sleepSweetSpot.avgProductivity}/5).`,
      metricName: 'sleep_duration',
      impactPct: null,
      confidence: Math.min(1, days.length / 30),
      metadata: sleepSweetSpot,
    });
  }

  const peakWindow = await findPeakSessionHours(userId, timezone);
  if (peakWindow) {
    const formatHour = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12} ${period}`;
    };

    insights.push({
      insightType: InsightType.peak_hour,
      title: 'Historical peak focus window',
      description: `Your strongest work sessions cluster between ${formatHour(peakWindow.startHour)} and ${formatHour(peakWindow.endHour)} (avg quality ${peakWindow.avgQuality}/4, n=${peakWindow.sampleCount}).`,
      metricName: 'session_quality',
      impactPct: null,
      confidence: Math.min(1, peakWindow.sampleCount / 30),
      metadata: peakWindow,
    });
  }

  const bestProject = await findBestProjectType(userId);
  if (bestProject) {
    insights.push({
      insightType: InsightType.top_driver,
      title: `Strongest work type: ${bestProject.projectName}`,
      description: `${bestProject.projectName} sessions average ${bestProject.avgQuality}/4 quality across ${bestProject.sessionCount} sessions.`,
      metricName: 'project_name',
      impactPct: null,
      confidence: Math.min(1, bestProject.sessionCount / 20),
      metadata: bestProject,
    });
  }

  const hrvFocus = significant.find(
    (c) => c.feature === 'hrvVsBaselinePct' && c.outcome === 'focusScore',
  );
  if (hrvFocus && hrvFocus.correlation > 0) {
    const xs = days.map((d) => d.hrvVsBaselinePct).filter((v): v is number => v != null);
    const ys = days
      .filter((d) => d.hrvVsBaselinePct != null)
      .map((d) => d.focusScore);
    const impact = quartileImpact(xs, ys);
    if (impact && impact.impactPct > 0) {
      insights.push({
        insightType: InsightType.hrv_impact,
        title: 'HRV above baseline boosts focus',
        description: `Days with higher HRV relative to your baseline score ${impact.impactPct}% higher on focus.`,
        metricName: 'hrv_vs_baseline_pct',
        impactPct: impact.impactPct,
        confidence: impact.confidence,
        metadata: { correlation: hrvFocus.correlation },
      });
    }
  }

  return insights;
}

export async function persistInsights(
  userId: string,
  insights: GeneratedInsight[],
): Promise<number> {
  const validFrom = new Date();
  validFrom.setUTCHours(0, 0, 0, 0);

  await prisma.insight.updateMany({
    where: { userId, validTo: null },
    data: { validTo: validFrom },
  });

  if (insights.length === 0) return 0;

  await prisma.insight.createMany({
    data: insights.map((insight) => ({
      userId,
      insightType: insight.insightType,
      title: insight.title,
      description: insight.description,
      metricName: insight.metricName,
      impactPct: insight.impactPct,
      confidence: insight.confidence,
      validFrom,
      metadata: toInputJson(insight.metadata),
    })),
  });

  return insights.length;
}

export async function getBiomarkerTrends(userId: string, days = 30) {
  const limit = Math.min(Math.max(days, 1), 90);
  const rows = await prisma.dailyFeature.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
    select: {
      date: true,
      sleepDuration: true,
      sleepEfficiency: true,
      avgHrv: true,
      hrvVsBaselinePct: true,
      restingHr: true,
      steps: true,
      exerciseMinutes: true,
      readinessScore: true,
    },
  });

  return {
    days: rows.length,
    trends: rows.reverse().map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      sleep_duration: r.sleepDuration,
      sleep_efficiency: r.sleepEfficiency,
      avg_hrv: r.avgHrv,
      hrv_vs_baseline_pct: r.hrvVsBaselinePct,
      resting_hr: r.restingHr,
      steps: r.steps,
      exercise_minutes: r.exerciseMinutes,
      readiness_score: r.readinessScore,
    })),
  };
}
