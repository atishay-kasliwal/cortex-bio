import { randomUUID } from 'crypto';

import { prisma } from '../lib/prisma.js';
import { utcToLocalDateKey } from '../lib/timezone.js';
import type { SyncPayload } from '../schemas/sync.js';
import {
  normalizeMetricType,
  sampleDedupKey,
  type NormalizedSample,
} from './metrics.js';

export type IngestResult = {
  samplesInserted: number;
  samplesSkipped: number;
  sleepSessionsUpserted: number;
  workoutsUpserted: number;
  affectedDates: string[];
};

function normalizeSample(
  raw: SyncPayload['samples'][number],
): NormalizedSample {
  return {
    metricType: normalizeMetricType(raw.metric_type),
    metricSubtype: raw.metric_subtype ?? null,
    value: raw.value,
    unit: raw.unit ?? null,
    startTime: raw.start_time,
    endTime: raw.end_time ?? null,
    sourceDevice: raw.source_device ?? raw.source ?? null,
    sourceApp: raw.source_app ?? null,
    metadata: raw.metadata ?? {},
  };
}

async function filterNewSamples(
  userId: string,
  samples: NormalizedSample[],
): Promise<NormalizedSample[]> {
  if (samples.length === 0) return [];

  const minStart = new Date(
    Math.min(...samples.map((s) => s.startTime.getTime())),
  );
  const maxStart = new Date(
    Math.max(...samples.map((s) => s.startTime.getTime())),
  );

  const existing = await prisma.healthSample.findMany({
    where: {
      userId,
      startTime: { gte: minStart, lte: maxStart },
      metricType: { in: [...new Set(samples.map((s) => s.metricType))] },
    },
    select: {
      metricType: true,
      startTime: true,
      sourceDevice: true,
      metricSubtype: true,
    },
  });

  const existingKeys = new Set(existing.map(sampleDedupKey));
  return samples.filter((s) => !existingKeys.has(sampleDedupKey(s)));
}

export async function ingestHealthData(
  userId: string,
  timezone: string,
  payload: SyncPayload,
): Promise<IngestResult> {
  const normalized = payload.samples.map(normalizeSample);
  const newSamples = await filterNewSamples(userId, normalized);

  if (newSamples.length > 0) {
    await prisma.healthSample.createMany({
      data: newSamples.map((s) => ({
        id: randomUUID(),
        userId,
        metricType: s.metricType,
        metricSubtype: s.metricSubtype,
        value: s.value,
        unit: s.unit,
        startTime: s.startTime,
        endTime: s.endTime,
        sourceDevice: s.sourceDevice,
        sourceApp: s.sourceApp,
        metadata: s.metadata,
      })),
    });
  }

  let sleepSessionsUpserted = 0;
  for (const raw of payload.sleep_sessions) {
    const sleepStart = raw.sleep_start ?? raw.start_time;
    const sleepEnd = raw.sleep_end ?? raw.end_time;
    if (!sleepStart || !sleepEnd) continue;

    const remMinutes = raw.rem_minutes ?? raw.rem_sleep_min ?? 0;
    const deepMinutes = raw.deep_minutes ?? raw.deep_sleep_min ?? 0;
    const coreMinutes = raw.core_minutes ?? raw.core_sleep_min ?? 0;
    const awakeMinutes = raw.awake_minutes ?? raw.awake_min ?? 0;
    const asleepMinutes = remMinutes + deepMinutes + coreMinutes;
    const spanMinutes = (sleepEnd.getTime() - sleepStart.getTime()) / 60_000;
    const durationMinutes =
      raw.duration_minutes ?? raw.duration_min ?? Math.max(asleepMinutes, spanMinutes);

    const inBedMinutes = raw.in_bed_min ?? durationMinutes + awakeMinutes;
    const sleepEfficiency =
      raw.sleep_efficiency ??
      (inBedMinutes > 0 ? Math.min(asleepMinutes / inBedMinutes, 1) : null);

    await prisma.sleepSession.upsert({
      where: {
        userId_sleepStart_sleepEnd: {
          userId,
          sleepStart,
          sleepEnd,
        },
      },
      create: {
        userId,
        sleepStart,
        sleepEnd,
        durationMinutes,
        remMinutes,
        deepMinutes,
        coreMinutes,
        awakeMinutes,
        sleepEfficiency,
        sourceDevice: raw.source_device ?? raw.source ?? null,
        metadata: raw.metadata ?? {},
      },
      update: {
        durationMinutes,
        remMinutes,
        deepMinutes,
        coreMinutes,
        awakeMinutes,
        sleepEfficiency,
        sourceDevice: raw.source_device ?? raw.source ?? null,
        metadata: raw.metadata ?? {},
      },
    });
    sleepSessionsUpserted += 1;
  }

  let workoutsUpserted = 0;
  for (const raw of payload.workouts) {
    const startTime = raw.start_time ?? raw.started_at;
    const endTime = raw.end_time ?? raw.ended_at;
    if (!startTime || !endTime) continue;

    const durationMinutes =
      raw.duration_minutes ??
      raw.duration_min ??
      (endTime.getTime() - startTime.getTime()) / 60_000;

    const existing = await prisma.workout.findFirst({
      where: { userId, startTime, endTime },
    });

    if (existing) {
      await prisma.workout.update({
        where: { id: existing.id },
        data: {
          workoutType: raw.workout_type,
          durationMinutes,
          calories: raw.calories ?? null,
          avgHeartRate: raw.avg_heart_rate ?? null,
          maxHeartRate: raw.max_heart_rate ?? null,
          sourceDevice: raw.source_device ?? raw.source ?? null,
          metadata: raw.metadata ?? {},
        },
      });
    } else {
      await prisma.workout.create({
        data: {
          userId,
          workoutType: raw.workout_type,
          startTime,
          endTime,
          durationMinutes,
          calories: raw.calories ?? null,
          avgHeartRate: raw.avg_heart_rate ?? null,
          maxHeartRate: raw.max_heart_rate ?? null,
          sourceDevice: raw.source_device ?? raw.source ?? null,
          metadata: raw.metadata ?? {},
        },
      });
    }
    workoutsUpserted += 1;
  }

  const affectedDates = new Set<string>();

  for (const s of normalized) {
    affectedDates.add(utcToLocalDateKey(s.startTime, timezone));
  }
  for (const raw of payload.sleep_sessions) {
    const sleepEnd = raw.sleep_end ?? raw.end_time;
    if (sleepEnd) {
      affectedDates.add(utcToLocalDateKey(sleepEnd, timezone));
    }
  }
  for (const raw of payload.workouts) {
    const start = raw.start_time ?? raw.started_at;
    if (start) {
      affectedDates.add(utcToLocalDateKey(start, timezone));
    }
  }

  return {
    samplesInserted: newSamples.length,
    samplesSkipped: normalized.length - newSamples.length,
    sleepSessionsUpserted,
    workoutsUpserted,
    affectedDates: [...affectedDates].sort(),
  };
}
