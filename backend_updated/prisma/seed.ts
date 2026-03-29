import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shipper = await prisma.user.upsert({
    where: { mobile: '+919900000001' },
    update: {},
    create: { mobile: '+919900000001', name: 'Demo Shipper', role: 'SHIPPER', status: 'ACTIVE' },
  });

  const driver = await prisma.user.upsert({
    where: { mobile: '+919900000002' },
    update: {},
    create: { mobile: '+919900000002', name: 'Demo Driver', role: 'DRIVER', status: 'ACTIVE' },
  });

  const load = await prisma.load.create({
    data: {
      shipperUserId: shipper.id,
      pickupAddress: 'Delhi Industrial Area',
      dropAddress: 'Jaipur Warehouse Zone',
      pickupCity: 'Delhi',
      dropCity: 'Jaipur',
      materialType: 'Industrial Goods',
      weightTons: 12,
      quotedPrice: 18000,
      status: 'OPEN',
    },
  });

  await prisma.trip.create({
    data: {
      loadId: load.id,
      driverUserId: driver.id,
      vehicleNumber: 'HR55AB1234',
      etaHours: 6,
      currentStatus: 'ASSIGNED',
    },
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
