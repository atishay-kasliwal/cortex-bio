import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(8000),
  DEFAULT_USER_EMAIL: z.string().email().default('founder@cortex.bio'),
  API_KEY_PEPPER: z.string().min(8).default('cortex-bio-dev-pepper'),
  FEATURE_FORECASTING: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_ML: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_CORTEX: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_ORGANIZATIONS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  PUBLIC_API_URL: z.string().url().default('https://api.atriveo.com'),
  ADMIN_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_JWKS_URL: z.string().url().optional(),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:3006,http://localhost:5173,https://bio.atriveo.com,https://preview.bio.atriveo.com',
    )
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
  SLEEP_TARGET_HOURS: z.coerce.number().default(7.5),
  CHRONOTYPE_MIN_SLEEP_DAYS: z.coerce.number().int().min(7).default(14),
});

export const config = envSchema.parse(process.env);
