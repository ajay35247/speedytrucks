"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jobs_1 = require("./lib/jobs");
const logger_1 = require("./lib/logger");
const prisma_1 = require("./lib/prisma");
async function processJob(job) {
    const payload = (job.payloadJson || {});
    logger_1.logger.info({ jobId: job.id, name: job.name, payload }, 'Processing job');
    switch (job.name) {
        case 'payment.settlement.review': {
            const paymentOrderId = String(payload.paymentOrderId || '');
            if (paymentOrderId) {
                await prisma_1.prisma.paymentOrder.updateMany({
                    where: { id: paymentOrderId, status: 'AUTHORIZED' },
                    data: { status: 'AUTHORIZED' },
                });
            }
            break;
        }
        case 'payment.settlement.capture': {
            const paymentOrderId = String(payload.paymentOrderId || '');
            const payment = paymentOrderId ? await prisma_1.prisma.paymentOrder.findUnique({ where: { id: paymentOrderId } }) : null;
            if (payment?.status === 'CAPTURED') {
                const existingLedger = await prisma_1.prisma.walletLedger.findFirst({
                    where: { referenceId: payment.id, category: 'PAYMENT_CAPTURED' },
                });
                if (!existingLedger) {
                    await prisma_1.prisma.walletLedger.create({
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
            const settlement = settlementId ? await prisma_1.prisma.settlement.findUnique({ where: { id: settlementId } }) : null;
            if (settlement?.status === 'PAID') {
                await prisma_1.prisma.walletLedger.create({
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
            await prisma_1.prisma.otpRequest.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
            break;
        }
        case 'maintenance.expire.sessions': {
            await prisma_1.prisma.userSession.updateMany({
                where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
                data: { status: 'EXPIRED', revokedAt: new Date() },
            });
            await prisma_1.prisma.refreshToken.updateMany({
                where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
                data: { status: 'EXPIRED', lastUsedAt: new Date() },
            });
            break;
        }
        case 'maintenance.stale.trips': {
            await prisma_1.prisma.trip.updateMany({
                where: { currentStatus: 'IN_TRANSIT', updatedAt: { lt: new Date(Date.now() - 12 * 60 * 60 * 1000) } },
                data: { currentStatus: 'CANCELLED' },
            });
            break;
        }
        default: {
            logger_1.logger.warn({ name: job.name, jobId: job.id }, 'Unhandled job type; marking processed for idempotent queue flow');
        }
    }
    await (0, jobs_1.markJobProcessed)(job.id);
}
async function runCycle() {
    await (0, jobs_1.requeueStuckJobs)(10);
    const jobs = await (0, jobs_1.reserveQueuedJobs)(25);
    for (const job of jobs) {
        try {
            await processJob(job);
        }
        catch (error) {
            await (0, jobs_1.markJobFailed)(job.id, error);
        }
    }
    logger_1.logger.info({ processed: jobs.length }, 'Worker cycle complete');
}
async function scheduleMaintenanceJobs() {
    const existing = await prisma_1.prisma.appJob.findMany({
        where: {
            name: { in: ['maintenance.cleanup.otp', 'maintenance.expire.sessions', 'maintenance.stale.trips'] },
            status: { in: ['QUEUED', 'PROCESSING'] },
        },
    });
    const existingNames = new Set(existing.map((item) => item.name));
    const jobs = [
        ['maintenance.cleanup.otp', 15 * 60 * 1000],
        ['maintenance.expire.sessions', 10 * 60 * 1000],
        ['maintenance.stale.trips', 30 * 60 * 1000],
    ];
    for (const [name, delayMs] of jobs) {
        if (!existingNames.has(name)) {
            await prisma_1.prisma.appJob.create({ data: { name, payloadJson: {}, availableAt: new Date(Date.now() + delayMs) } });
        }
    }
}
async function main() {
    await scheduleMaintenanceJobs();
    await runCycle();
}
main().catch((error) => {
    logger_1.logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Worker crashed');
    process.exit(1);
});
