import { markJobFailed, markJobProcessed, requeueStuckJobs, reserveQueuedJobs } from './lib/jobs';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

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
      const settlementId = String(payload.settlementId || '');
      const settlement = settlementId ? await prisma.settlement.findUnique({ where: { id: settlementId } }) : null;
      if (settlement?.status === 'PAID') {
        await prisma.walletLedger.create({
          data: {
            userId: settlement.userId,
            direction: 'DEBIT',
            amountInPaise: settlement.amountInPaise,
            category: 'SETTLEMENT_PAID',
            referenceId: settlement.id,
            referenceType: 'settlement',
            notes: settlement.reference || 'Settlement paid',
          },
        });
      }
      break;
    }
    case 'maintenance.cleanup.otp': {
      await prisma.otpRequest.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
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
      break;
    }
    case 'maintenance.stale.trips': {
      await prisma.trip.updateMany({
        where: { currentStatus: 'IN_TRANSIT', updatedAt: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
        data: { currentStatus: 'CANCELLED' },
      });
      break;
    }
    default: {
      logger.warn({ name: job.name, jobId: job.id }, 'Unhandled job type; marking processed for idempotent queue flow');
    }
  }

  await markJobProcessed(job.id);
}

async function runCycle() {
  await requeueStuckJobs(10);
  const jobs = await reserveQueuedJobs(25);
  for (const job of jobs) {
    try {
      await processJob(job as { id: string; name: string; payloadJson: unknown });
    } catch (error) {
      await markJobFailed(job.id, error);
    }
  }
  logger.info({ processed: jobs.length }, 'Worker cycle complete');
}

async function scheduleMaintenanceJobs() {
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
      await prisma.appJob.create({ data: { name, payloadJson: {}, availableAt: new Date(Date.now() + delayMs) } });
    }
  }
}

async function main() {
  await scheduleMaintenanceJobs();
  await runCycle();
}

main().catch((error) => {
  logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Worker crashed');
  process.exit(1);
});
