import { DateTime } from 'luxon';

import { prisma } from '../lib/prisma.js';
import { toDateOnly } from '../lib/timezone.js';
import type { DailyLabelInput } from '../schemas/labels.js';

export async function upsertDailyLabel(
  userId: string,
  dateKey: string,
  input: DailyLabelInput,
) {
  const date = toDateOnly(DateTime.fromISO(dateKey, { zone: 'utc' }));

  const label = await prisma.dailyLabel.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      productivityScore: input.productivity_score,
      energyScore: input.energy_score,
      focusScore: input.focus_score,
      moodScore: input.mood_score,
      notes: input.notes ?? null,
    },
    update: {
      productivityScore: input.productivity_score,
      energyScore: input.energy_score,
      focusScore: input.focus_score,
      moodScore: input.mood_score,
      notes: input.notes ?? null,
    },
  });

  await prisma.dailyFeature.updateMany({
    where: { userId, date },
    data: { checkinCount: 1 },
  });

  return label;
}

export async function getDailyLabel(userId: string, dateKey: string) {
  const date = toDateOnly(DateTime.fromISO(dateKey, { zone: 'utc' }));
  return prisma.dailyLabel.findUnique({
    where: { userId_date: { userId, date } },
  });
}

export async function listDailyLabels(
  userId: string,
  from?: string,
  to?: string,
  limit = 30,
) {
  const where: { userId: string; date?: { gte?: Date; lte?: Date } } = { userId };

  if (from) {
    where.date = { ...where.date, gte: toDateOnly(DateTime.fromISO(from, { zone: 'utc' })) };
  }
  if (to) {
    where.date = { ...where.date, lte: toDateOnly(DateTime.fromISO(to, { zone: 'utc' })) };
  }

  return prisma.dailyLabel.findMany({
    where,
    orderBy: { date: 'desc' },
    take: limit,
  });
}

export async function getLabelProgress(userId: string) {
  const [labelCount, sessionCount, firstLabel, recentLabels] = await Promise.all([
    prisma.dailyLabel.count({ where: { userId } }),
    prisma.workSession.count({
      where: { userId, sessionQuality: { not: null } },
    }),
    prisma.dailyLabel.findFirst({
      where: { userId },
      orderBy: { date: 'asc' },
      select: { date: true },
    }),
    prisma.dailyLabel.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 7,
      select: {
        date: true,
        productivityScore: true,
        focusScore: true,
        energyScore: true,
        moodScore: true,
      },
    }),
  ]);

  const daysSinceStart = firstLabel
    ? Math.ceil(
        (Date.now() - firstLabel.date.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  return {
    daily_labels: labelCount,
    completed_sessions: sessionCount,
    goal_daily_labels: 30,
    goal_sessions: 100,
    daily_labels_pct: Math.min(100, Math.round((labelCount / 30) * 100)),
    sessions_pct: Math.min(100, Math.round((sessionCount / 100) * 100)),
    days_collecting: daysSinceStart,
    recent_labels: recentLabels,
    phase_1_complete: labelCount >= 30 && sessionCount >= 100,
  };
}
