import { ConflictException } from '@nestjs/common';
import { EmergencyRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OCCUPIED_CASE_STATUSES } from './active-case-statuses';

/** Case is closed — crew on this case may be assigned elsewhere. */
export const TERMINAL_CASE_STATUSES: EmergencyRequestStatus[] = ['COMPLETED', 'CANCELLED'];

export type BusyCrewMaps = {
  driverCase: Map<string, { caseId: string; trackingCode: string }>;
  nurseCase: Map<string, { caseId: string; trackingCode: string }>;
  ambulanceCase: Map<string, { caseId: string; trackingCode: string }>;
  busyDriverIds: string[];
  busyNurseIds: string[];
  busyAmbulanceIds: string[];
};

export type CrewAssignmentIds = {
  driverId?: string | null;
  nurseId?: string | null;
  ambulanceId?: string | null;
};

/**
 * Clear crew links on pre-dispatch cases (PENDING/REVIEWING) and reset stuck ON_DUTY
 * employees/ambulances that are not on an in-progress mission.
 */
export async function reconcileCrewOccupancy(prisma: PrismaService): Promise<number> {
  let repaired = 0;

  const orphanedCases = await prisma.emergencyRequest.findMany({
    where: {
      status: { notIn: [...TERMINAL_CASE_STATUSES, ...OCCUPIED_CASE_STATUSES] },
      OR: [{ driverId: { not: null } }, { nurseId: { not: null } }, { ambulanceId: { not: null } }],
    },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      driverId: true,
      nurseId: true,
      ambulanceId: true,
    },
  });

  for (const row of orphanedCases) {
    await releaseCrewForCase(prisma, {
      driverId: row.driverId,
      nurseId: row.nurseId,
      ambulanceId: row.ambulanceId,
    });
    await prisma.emergencyRequest.update({
      where: { id: row.id },
      data: {
        driverId: null,
        nurseId: null,
        ambulanceId: null,
        assignedAt: null,
      },
    });
    repaired += 1;
  }

  const occupiedCases = await prisma.emergencyRequest.findMany({
    where: { status: { in: OCCUPIED_CASE_STATUSES } },
    select: { driverId: true, nurseId: true, ambulanceId: true },
  });

  const busyDriverIds = new Set(
    occupiedCases.map((c) => c.driverId).filter(Boolean) as string[],
  );
  const busyNurseIds = new Set(
    occupiedCases.map((c) => c.nurseId).filter(Boolean) as string[],
  );
  const busyAmbulanceIds = new Set(
    occupiedCases.map((c) => c.ambulanceId).filter(Boolean) as string[],
  );

  const stuckEmployees = await prisma.employee.findMany({
    where: {
      employeeRole: { name: { in: ['Driver', 'Nurse'] } },
      status: 'ACTIVE',
      OR: [
        { shiftStatus: 'ON_DUTY' },
        { assignedAmbulanceId: { not: null } },
      ],
    },
    select: { id: true, shiftStatus: true, assignedAmbulanceId: true },
  });

  for (const emp of stuckEmployees) {
    const onMission = busyDriverIds.has(emp.id) || busyNurseIds.has(emp.id);
    if (onMission) continue;

    await prisma.employee.update({
      where: { id: emp.id },
      data: { shiftStatus: 'AVAILABLE', assignedAmbulanceId: null },
    });
    repaired += 1;
  }

  const stuckAmbulances = await prisma.ambulance.findMany({
    where: { status: 'ON_DUTY', isActive: true },
    select: { id: true },
  });

  for (const amb of stuckAmbulances) {
    if (busyAmbulanceIds.has(amb.id)) continue;
    await prisma.ambulance.update({
      where: { id: amb.id },
      data: { status: 'AVAILABLE' },
    });
    repaired += 1;
  }

  return repaired;
}

/** Crew assigned to an in-progress mission cannot take another case. */
export async function getBusyCrewMaps(
  prisma: PrismaService,
  excludeCaseId?: string,
): Promise<BusyCrewMaps> {
  const rows = await prisma.emergencyRequest.findMany({
    where: {
      status: { in: OCCUPIED_CASE_STATUSES },
      ...(excludeCaseId ? { id: { not: excludeCaseId } } : {}),
      OR: [{ driverId: { not: null } }, { nurseId: { not: null } }, { ambulanceId: { not: null } }],
    },
    select: {
      id: true,
      trackingCode: true,
      driverId: true,
      nurseId: true,
      ambulanceId: true,
    },
  });

  const driverCase = new Map<string, { caseId: string; trackingCode: string }>();
  const nurseCase = new Map<string, { caseId: string; trackingCode: string }>();
  const ambulanceCase = new Map<string, { caseId: string; trackingCode: string }>();

  for (const row of rows) {
    const code = row.trackingCode?.trim() || row.id;
    if (row.driverId) driverCase.set(row.driverId, { caseId: row.id, trackingCode: code });
    if (row.nurseId) nurseCase.set(row.nurseId, { caseId: row.id, trackingCode: code });
    if (row.ambulanceId) ambulanceCase.set(row.ambulanceId, { caseId: row.id, trackingCode: code });
  }

  return {
    driverCase,
    nurseCase,
    ambulanceCase,
    busyDriverIds: [...driverCase.keys()],
    busyNurseIds: [...nurseCase.keys()],
    busyAmbulanceIds: [...ambulanceCase.keys()],
  };
}

/** Block assignment when driver, nurse, or ambulance is already on another in-progress mission. */
export async function assertCrewAvailableForAssignment(
  prisma: PrismaService,
  params: CrewAssignmentIds,
  excludeCaseId?: string,
): Promise<void> {
  const maps = await getBusyCrewMaps(prisma, excludeCaseId);

  if (params.driverId) {
    const hit = maps.driverCase.get(params.driverId);
    if (hit) {
      throw new ConflictException(
        `Driver is already on active case ${hit.trackingCode} and cannot be assigned to another case`,
      );
    }
  }
  if (params.nurseId) {
    const hit = maps.nurseCase.get(params.nurseId);
    if (hit) {
      throw new ConflictException(
        `Nurse is already on active case ${hit.trackingCode} and cannot be assigned to another case`,
      );
    }
  }
  if (params.ambulanceId) {
    const hit = maps.ambulanceCase.get(params.ambulanceId);
    if (hit) {
      throw new ConflictException(
        `Ambulance is already on active case ${hit.trackingCode} and cannot be assigned to another case`,
      );
    }
  }
}

/** Mark crew and ambulance as occupied when linked to an in-progress mission. */
export async function occupyCrewForCase(prisma: PrismaService, params: CrewAssignmentIds) {
  const crewIds = [params.driverId, params.nurseId].filter(Boolean) as string[];
  if (crewIds.length) {
    await prisma.employee.updateMany({
      where: { id: { in: crewIds } },
      data: { shiftStatus: 'ON_DUTY' },
    });
  }
  if (params.ambulanceId) {
    await prisma.ambulance.update({
      where: { id: params.ambulanceId },
      data: { status: 'ON_DUTY' },
    });
  }
}

/** Free crew and ambulance when a case closes or crew is removed. */
export async function releaseCrewForCase(prisma: PrismaService, params: CrewAssignmentIds) {
  const crewIds = [params.driverId, params.nurseId].filter(Boolean) as string[];
  if (crewIds.length) {
    await prisma.employee.updateMany({
      where: { id: { in: crewIds } },
      data: { shiftStatus: 'AVAILABLE', assignedAmbulanceId: null },
    });
  }
  if (params.ambulanceId) {
    await prisma.ambulance.update({
      where: { id: params.ambulanceId },
      data: { status: 'AVAILABLE' },
    });
  }
}
