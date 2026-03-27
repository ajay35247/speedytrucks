import { prisma } from './prisma';

type JobPayload = Record<string, unknown>;

export async function enqueueJob(name: string, payload: JobPayload, options?: { userId?: string; delayMs?: number }) {
  return prisma.appJob.create({
    data: {
      name,
      payloadJson: payload,
      userId: options?.userId,
      availableAt: new Date(Date.now() + (options?.delayMs || 0)),
    },
  });
}

export async function reserveQueuedJobs(limit = 20) {
  const jobs = await prisma.appJob.findMany({
    where: { status: 'QUEUED', availableAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const reserved = [];
  for (const job of jobs) {
    const updated = await prisma.appJob.updateMany({
      where: { id: job.id, status: 'QUEUED' },
      data: { status: 'PROCESSING', lockedAt: new Date(), attempts: { increment: 1 } },
    });
    if (updated.count === 1) reserved.push({ ...job, status: 'PROCESSING' as const });
  }
  return reserved;
}

export async function getQueuedJobs() {
  return prisma.appJob.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
}

export async function markJobProcessed(jobId: string) {
  await prisma.appJob.update({ where: { id: jobId }, data: { status: 'PROCESSED', processedAt: new Date(), lastError: null } });
}

export async function markJobFailed(jobId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.appJob.update({ where: { id: jobId }, data: { status: 'FAILED', failedAt: new Date(), lastError: message } });
}

export async function requeueStuckJobs(maxMinutes = 10) {
  const threshold = new Date(Date.now() - maxMinutes * 60 * 1000);
  const result = await prisma.appJob.updateMany({
    where: { status: 'PROCESSING', lockedAt: { lt: threshold } },
    data: { status: 'QUEUED', lockedAt: null, availableAt: new Date() },
  });
  return result.count;
}
