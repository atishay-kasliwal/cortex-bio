import { DateTime } from 'luxon';

import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

export type ChronotypeResult = {
  classification: string;
  avgWakeHour: number;
  avgSleepOnsetHour: number;
  wakeTimeStdDevHours: number;
  sampleDays: number;
  confidence: number;
};

function hourFromDate(instant: Date, timezone: string): number {
  const dt = DateTime.fromJSDate(instant, { zone: 'utc' }).setZone(timezone);
  return dt.hour + dt.minute / 60 + dt.second / 3600;
}

function classifyChronotype(avgWakeHour: number): string {
  if (avgWakeHour < 6.5) return 'morning_lark';
  if (avgWakeHour < 7.5) return 'moderate_morning';
  if (avgWakeHour < 8.5) return 'neutral';
  if (avgWakeHour < 9.5) return 'moderate_evening';
  return 'night_owl';
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export async function updateChronotypeEstimate(
  userId: string,
  timezone: string,
): Promise<ChronotypeResult | null> {
  const sessions = await prisma.sleepSession.findMany({
    where: { userId },
    orderBy: { sleepEnd: 'desc' },
    take: 90,
    select: { sleepStart: true, sleepEnd: true },
  });

  if (sessions.length < config.CHRONOTYPE_MIN_SLEEP_DAYS) {
    return null;
  }

  const wakeHours = sessions.map((s) => hourFromDate(s.sleepEnd, timezone));
  const sleepOnsetHours = sessions.map((s) => {
    let hour = hourFromDate(s.sleepStart, timezone);
    if (hour >= 12) hour -= 24;
    return hour;
  });

  const avgWakeHour =
    wakeHours.reduce((sum, v) => sum + v, 0) / wakeHours.length;
  const avgSleepOnsetHour =
    sleepOnsetHours.reduce((sum, v) => sum + v, 0) / sleepOnsetHours.length;
  const wakeTimeStdDevHours = stdDev(wakeHours);

  const consistencyBonus = Math.max(0, 1 - wakeTimeStdDevHours / 2);
  const sampleBonus = Math.min(sessions.length / 30, 1);
  const confidence = Math.round(consistencyBonus * sampleBonus * 100) / 100;

  const result: ChronotypeResult = {
    classification: classifyChronotype(avgWakeHour),
    avgWakeHour: Math.round(avgWakeHour * 100) / 100,
    avgSleepOnsetHour: Math.round(avgSleepOnsetHour * 100) / 100,
    wakeTimeStdDevHours: Math.round(wakeTimeStdDevHours * 100) / 100,
    sampleDays: sessions.length,
    confidence,
  };

  await prisma.user.update({
    where: { id: userId },
    data: { chronotypeEstimate: JSON.stringify(result) },
  });

  return result;
}

const CLASSIFICATIONS = new Set([
  'morning_lark',
  'moderate_morning',
  'neutral',
  'moderate_evening',
  'night_owl',
]);

export function parseChronotypeEstimate(
  raw: string | null,
): ChronotypeResult | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ChronotypeResult;
  } catch {
    if (CLASSIFICATIONS.has(raw)) {
      return {
        classification: raw,
        avgWakeHour: 7,
        avgSleepOnsetHour: 23,
        wakeTimeStdDevHours: 0.5,
        sampleDays: 0,
        confidence: 0.5,
      };
    }
    return null;
  }
}
