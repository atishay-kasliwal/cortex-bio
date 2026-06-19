import { DateTime } from 'luxon';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { toDateOnly } from '../lib/timezone.js';

export const cortexDailySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deep_work_minutes: z.number().optional().nullable(),
  attention_score: z.number().min(0).max(100).optional().nullable(),
  context_switches: z.number().int().optional().nullable(),
  coding_minutes: z.number().optional().nullable(),
  writing_minutes: z.number().optional().nullable(),
  research_minutes: z.number().optional().nullable(),
  meeting_minutes: z.number().optional().nullable(),
  output_score: z.number().min(0).max(100).optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const cortexBatchSchema = z.object({
  records: z.array(cortexDailySchema).min(1).max(500),
});

export type CortexDailyInput = z.infer<typeof cortexDailySchema>;

export async function ingestCortexDaily(
  userId: string,
  records: CortexDailyInput[],
): Promise<{ upserted: number; dates: string[] }> {
  const dates: string[] = [];

  for (const record of records) {
    const date = toDateOnly(DateTime.fromISO(record.date, { zone: 'utc' }));

    await prisma.cortexDailyMetric.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        deepWorkMinutes: record.deep_work_minutes ?? null,
        attentionScore: record.attention_score ?? null,
        contextSwitches: record.context_switches ?? null,
        codingMinutes: record.coding_minutes ?? null,
        writingMinutes: record.writing_minutes ?? null,
        researchMinutes: record.research_minutes ?? null,
        meetingMinutes: record.meeting_minutes ?? null,
        outputScore: record.output_score ?? null,
        metadata: record.metadata ?? {},
      },
      update: {
        deepWorkMinutes: record.deep_work_minutes ?? null,
        attentionScore: record.attention_score ?? null,
        contextSwitches: record.context_switches ?? null,
        codingMinutes: record.coding_minutes ?? null,
        writingMinutes: record.writing_minutes ?? null,
        researchMinutes: record.research_minutes ?? null,
        meetingMinutes: record.meeting_minutes ?? null,
        outputScore: record.output_score ?? null,
        metadata: record.metadata ?? {},
      },
    });

    dates.push(record.date);
  }

  return { upserted: records.length, dates: [...new Set(dates)].sort() };
}

export async function getTrainingDataset(
  userId: string,
  limit = 365,
): Promise<Record<string, unknown>[]> {
  return prisma.$queryRaw`
    SELECT * FROM v_training_dataset
    WHERE user_id = ${userId}::uuid
    ORDER BY date ASC
    LIMIT ${limit}
  `;
}

export async function getTrainingDatasetStats(userId: string) {
  const rows = await prisma.$queryRaw<
    Array<{ total_days: bigint; with_attention: bigint; with_deep_work: bigint; with_output: bigint }>
  >`
    SELECT
      COUNT(*)::BIGINT AS total_days,
      COUNT(attention_score)::BIGINT AS with_attention,
      COUNT(deep_work_minutes)::BIGINT AS with_deep_work,
      COUNT(output_score)::BIGINT AS with_output
    FROM v_training_dataset
    WHERE user_id = ${userId}::uuid
  `;

  const stats = rows[0];
  return {
    total_days: Number(stats?.total_days ?? 0),
    with_attention: Number(stats?.with_attention ?? 0),
    with_deep_work: Number(stats?.with_deep_work ?? 0),
    with_output: Number(stats?.with_output ?? 0),
    ml_ready: Number(stats?.total_days ?? 0) >= 21,
  };
}

export async function getCortexPerformance(userId: string, days = 30) {
  const limit = Math.min(Math.max(days, 1), 90);
  const rows = await prisma.cortexDailyMetric.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: limit,
  });

  const daily = rows.reverse().map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    deep_work_minutes: r.deepWorkMinutes,
    attention_score: r.attentionScore,
    output_score: r.outputScore,
    context_switches: r.contextSwitches,
    coding_minutes: r.codingMinutes,
    writing_minutes: r.writingMinutes,
    research_minutes: r.researchMinutes,
    meeting_minutes: r.meetingMinutes,
  }));

  const avg = (vals: (number | null)[]) => {
    const n = vals.filter((v): v is number => v != null);
    return n.length ? n.reduce((s, v) => s + v, 0) / n.length : null;
  };

  return {
    days: daily.length,
    summary: {
      avg_attention: avg(rows.map((r) => r.attentionScore)),
      avg_deep_work_minutes: avg(rows.map((r) => r.deepWorkMinutes)),
      avg_output_score: avg(rows.map((r) => r.outputScore)),
      avg_context_switches: avg(rows.map((r) => r.contextSwitches)),
    },
    daily,
  };
}
