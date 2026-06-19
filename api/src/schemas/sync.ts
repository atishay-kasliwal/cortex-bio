import { z } from 'zod';

export const healthSampleSchema = z.object({
  metric_type: z.string(),
  metric_subtype: z.string().optional().nullable(),
  value: z.number(),
  unit: z.string().optional().nullable(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().optional().nullable(),
  source_device: z.string().optional().nullable(),
  source_app: z.string().optional().nullable(),
  /** Legacy iOS field — mapped to source_device */
  source: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const sleepSessionSchema = z.object({
  sleep_start: z.coerce.date().optional(),
  sleep_end: z.coerce.date().optional(),
  /** Legacy iOS fields */
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  duration_minutes: z.number().optional(),
  duration_min: z.number().optional(),
  rem_minutes: z.number().optional().default(0),
  rem_sleep_min: z.number().optional().default(0),
  deep_minutes: z.number().optional().default(0),
  deep_sleep_min: z.number().optional().default(0),
  core_minutes: z.number().optional().default(0),
  core_sleep_min: z.number().optional().default(0),
  awake_minutes: z.number().optional().default(0),
  awake_min: z.number().optional().default(0),
  in_bed_min: z.number().optional(),
  sleep_efficiency: z.number().optional().nullable(),
  source_device: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const workoutSchema = z.object({
  workout_type: z.string(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  started_at: z.coerce.date().optional(),
  ended_at: z.coerce.date().optional(),
  duration_minutes: z.number().optional(),
  duration_min: z.number().optional(),
  calories: z.number().optional().nullable(),
  avg_heart_rate: z.number().optional().nullable(),
  max_heart_rate: z.number().optional().nullable(),
  source_device: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const syncPayloadSchema = z.object({
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  samples: z.array(healthSampleSchema).default([]),
  sleep_sessions: z.array(sleepSessionSchema).default([]),
  workouts: z.array(workoutSchema).default([]),
});

export type SyncPayload = z.infer<typeof syncPayloadSchema>;
