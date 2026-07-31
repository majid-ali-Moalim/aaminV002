import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/** Match crew or ambulance to a station (employee home station or assigned vehicle station). */
export function employeeBelongsToStation(
  employee: {
    stationId?: string | null;
    assignedAmbulance?: { stationId?: string | null } | null;
  },
  stationId: string,
): boolean {
  return (
    employee.stationId === stationId ||
    employee.assignedAmbulance?.stationId === stationId
  );
}

export function filterEmployeesByStation<
  T extends {
    stationId?: string | null;
    assignedAmbulance?: { stationId?: string | null } | null;
  },
>(employees: T[], stationId?: string | null): T[] {
  if (!stationId) return employees;
  return employees.filter((e) => employeeBelongsToStation(e, stationId));
}

export function filterAmbulancesByStation<
  T extends { stationId?: string | null },
>(ambulances: T[], stationId?: string | null): T[] {
  if (!stationId) return ambulances;
  return ambulances.filter((a) => a.stationId === stationId);
}

export function ambulanceBelongsToStation(
  ambulance: { stationId?: string | null },
  stationId: string,
): boolean {
  return ambulance.stationId === stationId;
}

/** Block assign when driver/nurse/ambulance are not at the case's home station. */
export async function assertAssignCrewMatchesCaseStation(
  prisma: PrismaService,
  caseStationId: string | null | undefined,
  params: { driverId?: string | null; nurseId?: string | null; ambulanceId?: string | null },
): Promise<void> {
  if (!caseStationId) return;

  const caseStation = await prisma.station.findUnique({
    where: { id: caseStationId },
    select: { name: true },
  });
  const caseStationLabel = caseStation?.name ?? 'this case station';

  if (params.driverId) {
    const driver = await prisma.employee.findUnique({
      where: { id: params.driverId },
      include: {
        station: { select: { name: true } },
        assignedAmbulance: { select: { stationId: true } },
      },
    });
    if (driver && !employeeBelongsToStation(driver, caseStationId)) {
      const theirStation = driver.station?.name ?? 'another station';
      throw new BadRequestException(
        `Driver ${driver.firstName} ${driver.lastName} belongs to ${theirStation}, not ${caseStationLabel}. Cannot assign crew from a different station.`,
      );
    }
  }

  if (params.nurseId) {
    const nurse = await prisma.employee.findUnique({
      where: { id: params.nurseId },
      include: {
        station: { select: { name: true } },
        assignedAmbulance: { select: { stationId: true } },
      },
    });
    if (nurse && !employeeBelongsToStation(nurse, caseStationId)) {
      const theirStation = nurse.station?.name ?? 'another station';
      throw new BadRequestException(
        `Nurse ${nurse.firstName} ${nurse.lastName} belongs to ${theirStation}, not ${caseStationLabel}. Cannot assign crew from a different station.`,
      );
    }
  }

  if (params.ambulanceId) {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: params.ambulanceId },
      include: { station: { select: { name: true } } },
    });
    if (ambulance && !ambulanceBelongsToStation(ambulance, caseStationId)) {
      const theirStation = ambulance.station?.name ?? 'another station';
      throw new BadRequestException(
        `Ambulance ${ambulance.ambulanceNumber ?? ambulance.id} belongs to ${theirStation}, not ${caseStationLabel}. Cannot assign resources from a different station.`,
      );
    }
  }
}
