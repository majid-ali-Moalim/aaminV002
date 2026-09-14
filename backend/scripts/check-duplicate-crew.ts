import { PrismaClient } from '@prisma/client';
import { OCCUPIED_CASE_STATUSES } from '../src/common/active-case-statuses';

const prisma = new PrismaClient();

async function main() {
  const codes = ['CASE-2026-0005', 'CASE-2026-0006'];
  const cases = await prisma.emergencyRequest.findMany({
    where: { trackingCode: { in: codes } },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      driverId: true,
      nurseId: true,
      ambulanceId: true,
      createdAt: true,
      updatedAt: true,
      assignedAt: true,
      pickupLocation: true,
      patientId: true,
      patient: { select: { fullName: true } },
      driver: { select: { firstName: true, lastName: true } },
      nurse: { select: { firstName: true, lastName: true } },
      ambulance: { select: { ambulanceNumber: true } },
    },
  });
  console.log('Target cases:', JSON.stringify(cases, null, 2));

  const active = await prisma.emergencyRequest.findMany({
    where: { status: { in: [...OCCUPIED_CASE_STATUSES] } },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      driverId: true,
      nurseId: true,
      ambulanceId: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  const byDriver = new Map<string, typeof active>();
  const byNurse = new Map<string, typeof active>();
  const byAmb = new Map<string, typeof active>();

  for (const row of active) {
    if (row.driverId) {
      const list = byDriver.get(row.driverId) ?? [];
      list.push(row);
      byDriver.set(row.driverId, list);
    }
    if (row.nurseId) {
      const list = byNurse.get(row.nurseId) ?? [];
      list.push(row);
      byNurse.set(row.nurseId, list);
    }
    if (row.ambulanceId) {
      const list = byAmb.get(row.ambulanceId) ?? [];
      list.push(row);
      byAmb.set(row.ambulanceId, list);
    }
  }

  const dupes = [
    ...[...byDriver.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ type: 'driver', id: k, cases: v })),
    ...[...byNurse.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ type: 'nurse', id: k, cases: v })),
    ...[...byAmb.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ type: 'ambulance', id: k, cases: v })),
  ];

  console.log('\nDuplicate crew on active cases:', JSON.stringify(dupes, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
