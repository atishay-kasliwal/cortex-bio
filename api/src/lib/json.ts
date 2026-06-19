import type { Prisma } from '@cortex-bio/db';

/** Cast app-level JSON objects for Prisma create/update inputs. */
export function toInputJson(
  value: Record<string, unknown>,
): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
