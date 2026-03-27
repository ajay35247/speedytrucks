"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateTripLocationRisk = evaluateTripLocationRisk;
exports.evaluatePaymentRisk = evaluatePaymentRisk;
const prisma_1 = require("../lib/prisma");
function haversineKm(aLat, aLng, bLat, bLng) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const aa = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}
async function createSignal(input) {
    return prisma_1.prisma.fraudSignal.create({ data: input });
}
async function evaluateTripLocationRisk(input) {
    const signals = [];
    if (typeof input.speed === 'number' && input.speed > 38) {
        signals.push({
            signalType: 'HIGH_SPEED_MOVEMENT', severity: 'MEDIUM', score: 55,
            reason: `Reported speed ${input.speed} m/s is unusually high for a freight trip`,
        });
    }
    if (typeof input.accuracyM === 'number' && input.accuracyM > 1200) {
        signals.push({
            signalType: 'LOW_GPS_ACCURACY', severity: 'LOW', score: 20,
            reason: `GPS accuracy ${input.accuracyM} m is unreliable`,
        });
    }
    if (Math.abs(input.lat) > 90 || Math.abs(input.lng) > 180) {
        signals.push({
            signalType: 'INVALID_GPS_COORDINATE', severity: 'HIGH', score: 95,
            reason: 'Received impossible GPS coordinates',
        });
    }
    const previous = await prisma_1.prisma.tripLocationPing.findFirst({
        where: { tripId: input.tripId },
        orderBy: { createdAt: 'desc' },
    });
    if (previous) {
        const minutes = Math.max((Date.now() - previous.createdAt.getTime()) / 60000, 0.01);
        const km = haversineKm(previous.lat, previous.lng, input.lat, input.lng);
        const kmPerHour = km / (minutes / 60);
        if (kmPerHour > 140) {
            signals.push({
                signalType: 'GPS_TELEPORT', severity: 'HIGH', score: 90,
                reason: `Vehicle jumped ${km.toFixed(2)} km in ${minutes.toFixed(1)} min`,
            });
        }
    }
    if (!signals.length)
        return [];
    return Promise.all(signals.map((signal) => createSignal({ ...signal, tripId: input.tripId, userId: input.driverUserId })));
}
async function evaluatePaymentRisk(input) {
    const signals = [];
    if (input.amountInPaise > 5000000) {
        signals.push({
            signalType: 'LARGE_PAYMENT_ORDER', severity: 'MEDIUM', score: 65,
            reason: `Payment order amount ₹${(input.amountInPaise / 100).toFixed(2)} exceeds the review threshold`,
        });
    }
    const recentFailed = await prisma_1.prisma.paymentOrder.count({
        where: { createdByUserId: input.userId, status: 'FAILED', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (recentFailed >= 3) {
        signals.push({
            signalType: 'MULTIPLE_FAILED_PAYMENTS', severity: 'HIGH', score: 85,
            reason: `${recentFailed} failed payment attempts in the last 24 hours`,
        });
    }
    if (!signals.length)
        return [];
    return Promise.all(signals.map((signal) => createSignal({ ...signal, userId: input.userId })));
}
