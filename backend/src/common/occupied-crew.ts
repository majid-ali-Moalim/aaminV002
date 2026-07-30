import { ConflictException } from '@nestjs/common';
import { EmergencyRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

/** Crew assigned to any open (non-terminal) emergency cannot take another case. */
export async function getBusyCrewMaps(
  prisma: PrismaService,
  excludeCaseId?: string,
): Promise<BusyCrewMaps> {
  const rows = await prisma.emergencyRequest.findMany({
    where: {
      status: { notIn: TERMINAL_CASE_STATUSES },
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

/** Block assignment when driver, nurse, or ambulance is already on another open case. */
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

/** Mark crew and ambulance as occupied when linked to an open case. */
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
