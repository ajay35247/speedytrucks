import { prisma } from './prisma';
import { AppError } from '../types';
import type { JwtUser } from '../types';

export async function getLoadOrThrow(loadId: string) {
  const load = await prisma.load.findUnique({ where: { id: loadId } });
  if (!load) throw new AppError(404, 'Load not found', 'LOAD_NOT_FOUND');
  return load;
}

export async function assertLoadAccess(user: JwtUser, loadId: string, code = 'LOAD_ACCESS_DENIED') {
  const load = await getLoadOrThrow(loadId);
  if (user.role === 'ADMIN') return load;
  if (user.role === 'SHIPPER' && load.shipperUserId !== user.id) {
    throw new AppError(403, 'You do not have access to this load', code);
  }
  if (user.role === 'DRIVER') {
    const trip = await prisma.trip.findUnique({ where: { loadId: load.id }, select: { driverUserId: true } });
    if (trip?.driverUserId !== user.id) {
      throw new AppError(403, 'You do not have access to this load', code);
    }
  }
  return load;
}

export async function getTripWithLoadOrThrow(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { load: true },
  });
  if (!trip) throw new AppError(404, 'Trip not found', 'TRIP_NOT_FOUND');
  return trip;
}

export async function assertTripAccess(user: JwtUser, tripId: string, code = 'TRIP_ACCESS_DENIED') {
  const trip = await getTripWithLoadOrThrow(tripId);
  if (user.role === 'ADMIN') return trip;
  if (user.role === 'DRIVER' && trip.driverUserId !== user.id) {
    throw new AppError(403, 'You do not have access to this trip', code);
  }
  if (user.role === 'SHIPPER' && trip.load.shipperUserId !== user.id) {
    throw new AppError(403, 'You do not have access to this trip', code);
  }
  return trip;
}

export async function getPaymentOrderOrThrow(paymentOrderId: string) {
  const payment = await prisma.paymentOrder.findUnique({
    where: { id: paymentOrderId },
    include: { load: true },
  });
  if (!payment) throw new AppError(404, 'Payment order not found', 'PAYMENT_ORDER_NOT_FOUND');
  return payment;
}

export async function assertPaymentAccess(user: JwtUser, paymentOrderId: string, code = 'PAYMENT_ACCESS_DENIED') {
  const payment = await getPaymentOrderOrThrow(paymentOrderId);
  if (user.role === 'ADMIN') return payment;
  if (user.role === 'SHIPPER') {
    const ownsLoad = payment.load ? payment.load.shipperUserId === user.id : false;
    if (payment.createdByUserId !== user.id && !ownsLoad) {
      throw new AppError(403, 'You do not have access to this payment', code);
    }
  }
  if (user.role === 'DRIVER') {
    throw new AppError(403, 'Drivers cannot access payment orders', code);
  }
  return payment;
}
