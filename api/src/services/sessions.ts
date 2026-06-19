import type { SessionQuality } from '../schemas/sessions.js';
import { prisma } from '../lib/prisma.js';

export async function startWorkSession(
  userId: string,
  projectName: string,
  notes?: string | null,
) {
  const active = await getActiveSession(userId);
  if (active) {
    throw new Error('ACTIVE_SESSION_EXISTS');
  }

  return prisma.workSession.create({
    data: {
      userId,
      startedAt: new Date(),
      projectName,
      notes: notes ?? null,
    },
  });
}

export async function endWorkSession(
  userId: string,
  sessionId: string,
  quality: SessionQuality,
  notes?: string | null,
) {
  const session = await prisma.workSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }
  if (session.endedAt) {
    throw new Error('SESSION_ALREADY_ENDED');
  }

  const endedAt = new Date();
  const durationMinutes =
    (endedAt.getTime() - session.startedAt.getTime()) / 60_000;

  return prisma.workSession.update({
    where: { id: sessionId },
    data: {
      endedAt,
      durationMinutes,
      sessionQuality: quality,
      notes: notes ?? session.notes,
    },
  });
}

export async function getActiveSession(userId: string) {
  return prisma.workSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  });
}

export async function listWorkSessions(userId: string, limit = 50) {
  return prisma.workSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}
