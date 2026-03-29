import { enqueueJob, markJobFailed, markJobProcessed, requeueStuckJobs, reserveQueuedJobs } from './lib/jobs';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const WORKER_POLL_MS = 5000;
const WORKER_IDLE_MS = 2000;
const MAINTENANCE_CHECK_MS = 60_000;
let shuttingDown = false;
let lastMaintenanceAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureRecurringMaintenanceJobs() {
  const existing = await prisma.appJob.findMany({
    where: {
      name: { in: ['maintenance.cleanup.otp', 'maintenance.expire.sessions', 'maintenance.stale.trips'] },
      status: { in: ['QUEUED', 'PROCESSING'] },
    },
  });
  const existingNames = new Set(existing.map((item: { name: string }) => item.name));

  const jobs = [
    ['maintenance.cleanup.otp', 15 * 60 * 1000],
    ['maintenance.expire.sessions', 10 * 60 * 1000],
    ['maintenance.stale.trips', 30 * 60 * 1000],
  ] as const;

  for (const [name, delayMs] of jobs) {
    if (!existingNames.has(name)) {
      await enqueueJob(name, {}, { delayMs });
    }
  }
}

async function processJob(job: { id: string; name: string; payloadJson: unknown }) {
  const payload = (job.payloadJson || {}) as Record<string, unknown>;
  logger.info({ jobId: job.id, name: job.name, payload }, 'Processing job');

  switch (job.name) {
    case 'payment.settlement.review': {
      const paymentOrderId = String(payload.paymentOrderId || '');
      if (paymentOrderId) {
        await prisma.paymentOrder.updateMany({
          where: { id: paymentOrderId, status: 'AUTHORIZED' },
          data: { status: 'AUTHORIZED' },
        });
      }
      break;
    }
    case 'payment.settlement.capture': {
      const paymentOrderId = String(payload.paymentOrderId || '');
      const payment = paymentOrderId ? await prisma.paymentOrder.findUnique({ where: { id: paymentOrderId } }) : null;
      if (payment?.status === 'CAPTURED') {
        const existingLedger = await prisma.walletLedger.findFirst({
          where: { referenceId: payment.id, category: 'PAYMENT_CAPTURED' },
        });
        if (!existingLedger) {
          await prisma.walletLedger.create({
            data: {
              userId: payment.createdByUserId,
              direction: 'CREDIT',
              amountInPaise: payment.amountInPaise,
              category: 'PAYMENT_CAPTURED',
              referenceId: payment.id,
              referenceType: 'paymentOrder',
              notes: `Captured Razorpay payment ${payment.razorpayOrderId}`,
            },
          });
        }
      }
      break;
    }
    case 'payment.failed.audit': {
      break;
    }
    case 'settlement.requested': {
      break;
    }
    case 'settlement.status.updated': {
      break;
    }
    case 'maintenance.cleanup.otp': {
      await prisma.otpRequest.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
      await enqueueJob('maintenance.cleanup.otp', {}, { delayMs: 15 * 60 * 1000 });
      break;
    }
    case 'maintenance.expire.sessions': {
      await prisma.userSession.updateMany({
        where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
        data: { status: 'EXPIRED', revokedAt: new Date() },
      });
      await prisma.refreshToken.updateMany({
        where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
        data: { status: 'EXPIRED', lastUsedAt: new Date() },
      });
      await enqueueJob('maintenance.expire.sessions', {}, { delayMs: 10 * 60 * 1000 });
      break;
    }
    case 'maintenance.stale.trips': {
      await prisma.trip.updateMany({
        where: { currentStatus: 'IN_TRANSIT', updatedAt: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
        data: { currentStatus: 'CANCELLED' },
      });
      await enqueueJob('maintenance.stale.trips', {}, { delayMs: 30 * 60 * 1000 });
      break;
    }
    default: {
      logger.warn({ name: job.name, jobId: job.id }, 'Unhandled job type; marking processed for idempotent queue flow');
    }
  }

  await markJobProcessed(job.id);
}

async function runLoop() {
  while (!shuttingDown) {
    const now = Date.now();
    if (now - lastMaintenanceAt >= MAINTENANCE_CHECK_MS) {
      await ensureRecurringMaintenanceJobs();
      await requeueStuckJobs(10);
      lastMaintenanceAt = now;
    }

    const jobs = await reserveQueuedJobs(25);
    if (jobs.length === 0) {
      await sleep(WORKER_IDLE_MS);
      continue;
    }

    for (const job of jobs) {
      try {
        await processJob(job as { id: string; name: string; payloadJson: unknown });
      } catch (error) {
        await markJobFailed(job.id, error);
      }
      if (shuttingDown) break;
    }

    await sleep(WORKER_POLL_MS);
  }
}

async function main() {
  await ensureRecurringMaintenanceJobs();
  await runLoop();
}

function handleShutdown(signal: string) {
  logger.info({ signal }, 'Worker shutdown requested');
  shuttingDown = true;
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

main().catch((error) => {
  logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Worker crashed');
  process.exit(1);
});
