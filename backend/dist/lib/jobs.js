"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueJob = enqueueJob;
exports.reserveQueuedJobs = reserveQueuedJobs;
exports.getQueuedJobs = getQueuedJobs;
exports.markJobProcessed = markJobProcessed;
exports.markJobFailed = markJobFailed;
exports.requeueStuckJobs = requeueStuckJobs;
const prisma_1 = require("./prisma");
async function enqueueJob(name, payload, options) {
    return prisma_1.prisma.appJob.create({
        data: {
            name,
            payloadJson: payload,
            userId: options?.userId,
            availableAt: new Date(Date.now() + (options?.delayMs || 0)),
        },
    });
}
async function reserveQueuedJobs(limit = 20) {
    const jobs = await prisma_1.prisma.appJob.findMany({
        where: { status: 'QUEUED', availableAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: limit,
    });
    const reserved = [];
    for (const job of jobs) {
        const updated = await prisma_1.prisma.appJob.updateMany({
            where: { id: job.id, status: 'QUEUED' },
            data: { status: 'PROCESSING', lockedAt: new Date(), attempts: { increment: 1 } },
        });
        if (updated.count === 1)
            reserved.push({ ...job, status: 'PROCESSING' });
    }
    return reserved;
}
async function getQueuedJobs() {
    return prisma_1.prisma.appJob.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
}
async function markJobProcessed(jobId) {
    await prisma_1.prisma.appJob.update({ where: { id: jobId }, data: { status: 'PROCESSED', processedAt: new Date(), lastError: null } });
}
async function markJobFailed(jobId, error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma_1.prisma.appJob.update({ where: { id: jobId }, data: { status: 'FAILED', failedAt: new Date(), lastError: message } });
}
async function requeueStuckJobs(maxMinutes = 10) {
    const threshold = new Date(Date.now() - maxMinutes * 60 * 1000);
    const result = await prisma_1.prisma.appJob.updateMany({
        where: { status: 'PROCESSING', lockedAt: { lt: threshold } },
        data: { status: 'QUEUED', lockedAt: null, availableAt: new Date() },
    });
    return result.count;
}
