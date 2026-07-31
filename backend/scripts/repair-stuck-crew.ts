/**
 * Repair crew stuck after case close/reassign without releaseCrewForCase.
 * Run: npx ts-node scripts/repair-stuck-crew.ts
 */
import { PrismaClient } from '@prisma/client';
import { reconcileCrewOccupancy } from '../src/common/occupied-crew';

const prisma = new PrismaClient();

async function main() {
  const repaired = await reconcileCrewOccupancy(prisma as any);

  const fieldEmployees = await prisma.employee.findMany({
    where: {
      employeeRole: { name: { in: ['Driver', 'Nurse'] } },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      shiftStatus: true,
      defaultShift: true,
      stationId: true,
      employeeRole: { select: { name: true } },
    },
  });

  const occupiedCases = await prisma.emergencyRequest.findMany({
    where: {
      status: {
        in: [
          'ASSIGNED',
          'DISPATCHED',
          'EN_ROUTE',
          'ARRIVED_SCENE',
          'PATIENT_STABILIZED',
          'TRANSPORTING',
          'ARRIVED_HOSPITAL',
        ],
      },
    },
    select: { driverId: true, nurseId: true },
  });

  const busyIds = new Set([
    ...occupiedCases.map((c) => c.driverId).filter(Boolean),
    ...occupiedCases.map((c) => c.nurseId).filter(Boolean),
  ] as string[]);

  console.log('\n--- Field crew status ---');
  for (const emp of fieldEmployees) {
    const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
    if (!name.toLowerCase().includes('shukri') && !name.toLowerCase().includes('ankar') && !name.toLowerCase().includes('anfac')) {
      continue;
    }
    console.log(
      JSON.stringify({
        name,
        code: emp.employeeCode,
        role: emp.employeeRole.name,
        shiftStatus: emp.shiftStatus,
        onMission: busyIds.has(emp.id),
      }),
    );
  }

  console.log(`\nDone. ${repaired} resource(s) repaired.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
