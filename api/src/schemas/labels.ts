import { z } from 'zod';

const score = z.number().int().min(1).max(5);

export const dailyLabelSchema = z.object({
  productivity_score: score,
  energy_score: score,
  focus_score: score,
  mood_score: score,
  notes: z.string().optional().nullable(),
});

export type DailyLabelInput = z.infer<typeof dailyLabelSchema>;
