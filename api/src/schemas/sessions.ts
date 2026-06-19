import { z } from 'zod';

export const SESSION_TYPES = [
  'Research',
  'Coding',
  'Writing',
  'Reading',
  'Meetings',
] as const;

export const sessionQualitySchema = z.enum(['poor', 'average', 'good', 'great']);

export const startSessionSchema = z.object({
  project_name: z.enum(SESSION_TYPES).or(z.string().min(1)),
  notes: z.string().optional().nullable(),
});

export const endSessionSchema = z.object({
  session_quality: sessionQualitySchema,
  notes: z.string().optional().nullable(),
});

export type SessionQuality = z.infer<typeof sessionQualitySchema>;

export const QUALITY_SCORE: Record<SessionQuality, number> = {
  poor: 1,
  average: 2,
  good: 3,
  great: 4,
};
