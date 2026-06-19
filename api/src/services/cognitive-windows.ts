import { DateTime } from 'luxon';

import { prisma } from '../lib/prisma.js';
import { localHourBoundsFromKey, toDateOnly } from '../lib/timezone.js';
import { QUALITY_SCORE, type SessionQuality } from '../schemas/sessions.js';
import { parseChronotypeEstimate } from './chronotype.js';

export const WINDOWS_VERSION = 'windows-v1';

export type HourlyScore = { hour: number; score: number };

export type CognitiveWindowResult = {
  date: string;
  hourly_curve: HourlyScore[];
  peak_window: { start: string; end: string } | null;
  secondary_window: { start: string; end: string } | null;
  crash_window: { start: string; end: string } | null;
  meeting_window: { start: string; end: string } | null;
  recovery_window: { start: string; end: string } | null;
  confidence: number;
  version: string;
};

function chronotypeHourBoost(classification: string | undefined, hour: number): number {
  switch (classification) {
    case 'morning_lark':
      if (hour >= 7 && hour <= 11) return 12;
      if (hour >= 13 && hour <= 14) return -8;
      break;
    case 'moderate_morning':
      if (hour >= 8 && hour <= 12) return 8;
      break;
    case 'night_owl':
      if (hour >= 10 && hour <= 13) return -5;
      if (hour >= 15 && hour <= 20) return 10;
      break;
    default:
      if (hour >= 9 && hour <= 11) return 6;
  }
  return 0;
}

async function buildSessionHourProfile(
  userId: string,
  timezone: string,
): Promise<Map<number, { sum: number; count: number }>> {
  const sessions = await prisma.workSession.findMany({
    where: { userId, sessionQuality: { not: null }, endedAt: { not: null } },
    select: { startedAt: true, sessionQuality: true },
  });

  const byHour = new Map<number, { sum: number; count: number }>();

  for (const session of sessions) {
    const hour = DateTime.fromJSDate(session.startedAt, { zone: 'utc' })
      .setZone(timezone).hour;
    const score = QUALITY_SCORE[session.sessionQuality as SessionQuality] ?? 2;
    const bucket = byHour.get(hour) ?? { sum: 0, count: 0 };
    bucket.sum += score;
    bucket.count += 1;
    byHour.set(hour, bucket);
  }

  return byHour;
}

async function buildActivityHourProfile(
  userId: string,
): Promise<Map<number, { sum: number; count: number }>> {
  const rows = await prisma.hourlyFeature.findMany({
    where: { userId, activityScore: { not: null } },
    select: { timestampHour: true, activityScore: true },
  });

  const byHour = new Map<number, { sum: number; count: number }>();

  for (const row of rows) {
    const hour = row.timestampHour.getUTCHours();
    const bucket = byHour.get(hour) ?? { sum: 0, count: 0 };
    bucket.sum += row.activityScore!;
    bucket.count += 1;
    byHour.set(hour, bucket);
  }

  return byHour;
}

function qualityToScore(avgQuality: number): number {
  return Math.round(((avgQuality - 1) / 3) * 100);
}

function buildHourlyCurve(
  sessionProfile: Map<number, { sum: number; count: number }>,
  activityProfile: Map<number, { sum: number; count: number }>,
  chronotypeClass: string | undefined,
  todayReadiness: number | null,
  todayHourly: Map<number, number>,
): HourlyScore[] {
  const curve: HourlyScore[] = [];

  for (let hour = 6; hour <= 22; hour++) {
    let score = 55;

    const session = sessionProfile.get(hour);
    if (session && session.count >= 3) {
      const avgQ = session.sum / session.count;
      score = qualityToScore(avgQ) * 0.55 + score * 0.45;
    }

    const activity = activityProfile.get(hour);
    if (activity && activity.count >= 5) {
      const avgA = activity.sum / activity.count;
      score += avgA * 25;
    }

    score += chronotypeHourBoost(chronotypeClass, hour);

    const todayActivity = todayHourly.get(hour);
    if (todayActivity != null) {
      score = score * 0.7 + todayActivity * 0.3;
    }

    if (todayReadiness != null) {
      const readinessAdj = (todayReadiness - 70) * 0.15;
      score += readinessAdj;
    }

    if (hour >= 12 && hour <= 14) score -= 8;

    score = Math.max(20, Math.min(98, Math.round(score)));
    curve.push({ hour, score });
  }

  return curve;
}

function hourAt(dateKey: string, hour: number, timezone: string): Date {
  return DateTime.fromISO(dateKey, { zone: timezone })
    .set({ hour, minute: 0, second: 0, millisecond: 0 })
    .toUTC()
    .toJSDate();
}

function findBestWindow(
  curve: HourlyScore[],
  durationHours: number,
  exclude?: { start: number; end: number },
): { startHour: number; endHour: number; avg: number } | null {
  if (curve.length < durationHours) return null;

  let best: { startHour: number; endHour: number; avg: number } | null = null;

  for (let i = 0; i <= curve.length - durationHours; i++) {
    const window = curve.slice(i, i + durationHours);
    const startHour = window[0]!.hour;
    const endHour = window[window.length - 1]!.hour + 1;

    if (exclude) {
      const overlaps =
        startHour < exclude.end && endHour > exclude.start;
      if (overlaps) continue;
    }

    const avg = window.reduce((s, p) => s + p.score, 0) / window.length;
    if (!best || avg > best.avg) {
      best = { startHour, endHour, avg };
    }
  }

  return best;
}

function findWorstWindow(
  curve: HourlyScore[],
  durationHours: number,
  hourMin = 11,
  hourMax = 16,
): { startHour: number; endHour: number; avg: number } | null {
  const midday = curve.filter((p) => p.hour >= hourMin && p.hour < hourMax);
  if (midday.length < durationHours) return null;

  let worst: { startHour: number; endHour: number; avg: number } | null = null;

  for (let i = 0; i <= midday.length - durationHours; i++) {
    const window = midday.slice(i, i + durationHours);
    const avg = window.reduce((s, p) => s + p.score, 0) / window.length;
    const startHour = window[0]!.hour;
    const endHour = window[window.length - 1]!.hour + 1;
    if (!worst || avg < worst.avg) {
      worst = { startHour, endHour, avg };
    }
  }

  return worst;
}

export async function computeCognitiveWindows(
  userId: string,
  dateKey: string,
  timezone: string,
): Promise<CognitiveWindowResult> {
  const [user, sessionProfile, activityProfile, feature] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    buildSessionHourProfile(userId, timezone),
    buildActivityHourProfile(userId),
    prisma.dailyFeature.findUnique({
      where: {
        userId_date: {
          userId,
          date: toDateOnly(DateTime.fromISO(dateKey, { zone: 'utc' })),
        },
      },
    }),
  ]);

  const chronotype = parseChronotypeEstimate(user?.chronotypeEstimate ?? null);
  const todayHourly = new Map<number, number>();

  for (let hour = 6; hour <= 22; hour++) {
    const { start, end } = localHourBoundsFromKey(dateKey, hour, timezone);
    const row = await prisma.hourlyFeature.findFirst({
      where: {
        userId,
        timestampHour: { gte: start, lt: end },
      },
      select: { activityScore: true, avgHrv: true },
    });
    if (row?.activityScore != null) {
      todayHourly.set(hour, row.activityScore * 100);
    } else if (row?.avgHrv != null) {
      todayHourly.set(hour, Math.min(100, row.avgHrv));
    }
  }

  const hourlyCurve = buildHourlyCurve(
    sessionProfile,
    activityProfile,
    chronotype?.classification,
    feature?.readinessScore ?? null,
    todayHourly,
  );

  const peak = findBestWindow(hourlyCurve, 2);
  const secondary = peak
    ? findBestWindow(hourlyCurve, 2, { start: peak.startHour, end: peak.endHour })
    : findBestWindow(hourlyCurve, 2);
  const crash = findWorstWindow(hourlyCurve, 1);
  const meeting = findBestWindow(
    hourlyCurve.filter((p) => p.hour >= 14 && p.hour <= 17),
    1,
  );
  const recovery = crash
    ? findBestWindow(
        hourlyCurve.filter((p) => p.hour > (crash?.endHour ?? 13)),
        1,
      )
    : null;

  const sessionCount = [...sessionProfile.values()].reduce((s, b) => s + b.count, 0);
  const confidence = Math.min(1, sessionCount / 50);

  const dateOnly = toDateOnly(DateTime.fromISO(dateKey, { zone: 'utc' }));

  const peakStart = peak ? hourAt(dateKey, peak.startHour, timezone) : null;
  const peakEnd = peak ? hourAt(dateKey, peak.endHour, timezone) : null;
  const secondaryStart = secondary
    ? hourAt(dateKey, secondary.startHour, timezone)
    : null;
  const secondaryEnd = secondary
    ? hourAt(dateKey, secondary.endHour, timezone)
    : null;
  const crashStart = crash ? hourAt(dateKey, crash.startHour, timezone) : null;
  const crashEnd = crash ? hourAt(dateKey, crash.endHour, timezone) : null;
  const meetingStart = meeting
    ? hourAt(dateKey, meeting.startHour, timezone)
    : null;
  const meetingEnd = meeting ? hourAt(dateKey, meeting.endHour, timezone) : null;
  const recoveryStart = recovery
    ? hourAt(dateKey, recovery.startHour, timezone)
    : null;
  const recoveryEnd = recovery
    ? hourAt(dateKey, recovery.endHour, timezone)
    : null;

  await prisma.cognitiveWindow.upsert({
    where: { userId_date: { userId, date: dateOnly } },
    create: {
      userId,
      date: dateOnly,
      peakWindowStart: peakStart,
      peakWindowEnd: peakEnd,
      secondaryWindowStart: secondaryStart,
      secondaryWindowEnd: secondaryEnd,
      crashWindowStart: crashStart,
      crashWindowEnd: crashEnd,
      meetingWindowStart: meetingStart,
      meetingWindowEnd: meetingEnd,
      recoveryWindowStart: recoveryStart,
      recoveryWindowEnd: recoveryEnd,
      hourlyCurve,
      confidence,
      version: WINDOWS_VERSION,
    },
    update: {
      peakWindowStart: peakStart,
      peakWindowEnd: peakEnd,
      secondaryWindowStart: secondaryStart,
      secondaryWindowEnd: secondaryEnd,
      crashWindowStart: crashStart,
      crashWindowEnd: crashEnd,
      meetingWindowStart: meetingStart,
      meetingWindowEnd: meetingEnd,
      recoveryWindowStart: recoveryStart,
      recoveryWindowEnd: recoveryEnd,
      hourlyCurve,
      confidence,
      version: WINDOWS_VERSION,
      computedAt: new Date(),
    },
  });

  const fmt = (d: Date | null) =>
    d
      ? DateTime.fromJSDate(d, { zone: 'utc' }).setZone(timezone).toISO()!
      : null;

  return {
    date: dateKey,
    hourly_curve: hourlyCurve,
    peak_window:
      peakStart && peakEnd ? { start: fmt(peakStart)!, end: fmt(peakEnd)! } : null,
    secondary_window:
      secondaryStart && secondaryEnd
        ? { start: fmt(secondaryStart)!, end: fmt(secondaryEnd)! }
        : null,
    crash_window:
      crashStart && crashEnd
        ? { start: fmt(crashStart)!, end: fmt(crashEnd)! }
        : null,
    meeting_window:
      meetingStart && meetingEnd
        ? { start: fmt(meetingStart)!, end: fmt(meetingEnd)! }
        : null,
    recovery_window:
      recoveryStart && recoveryEnd
        ? { start: fmt(recoveryStart)!, end: fmt(recoveryEnd)! }
        : null,
    confidence: Math.round(confidence * 100) / 100,
    version: WINDOWS_VERSION,
  };
}

export async function getCognitiveWindows(
  userId: string,
  dateKey: string,
  timezone: string,
): Promise<CognitiveWindowResult> {
  const dateOnly = toDateOnly(DateTime.fromISO(dateKey, { zone: 'utc' }));
  const existing = await prisma.cognitiveWindow.findUnique({
    where: { userId_date: { userId, date: dateOnly } },
  });

  if (existing?.hourlyCurve) {
    const curve = existing.hourlyCurve as HourlyScore[];
    const fmt = (d: Date | null) =>
      d
        ? DateTime.fromJSDate(d, { zone: 'utc' }).setZone(timezone).toISO()!
        : null;

    return {
      date: dateKey,
      hourly_curve: curve,
      peak_window:
        existing.peakWindowStart && existing.peakWindowEnd
          ? {
              start: fmt(existing.peakWindowStart)!,
              end: fmt(existing.peakWindowEnd)!,
            }
          : null,
      secondary_window:
        existing.secondaryWindowStart && existing.secondaryWindowEnd
          ? {
              start: fmt(existing.secondaryWindowStart)!,
              end: fmt(existing.secondaryWindowEnd)!,
            }
          : null,
      crash_window:
        existing.crashWindowStart && existing.crashWindowEnd
          ? {
              start: fmt(existing.crashWindowStart)!,
              end: fmt(existing.crashWindowEnd)!,
            }
          : null,
      meeting_window:
        existing.meetingWindowStart && existing.meetingWindowEnd
          ? {
              start: fmt(existing.meetingWindowStart)!,
              end: fmt(existing.meetingWindowEnd)!,
            }
          : null,
      recovery_window:
        existing.recoveryWindowStart && existing.recoveryWindowEnd
          ? {
              start: fmt(existing.recoveryWindowStart)!,
              end: fmt(existing.recoveryWindowEnd)!,
            }
          : null,
      confidence: existing.confidence ?? 0,
      version: existing.version,
    };
  }

  return computeCognitiveWindows(userId, dateKey, timezone);
}
