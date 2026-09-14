import { ConflictException, Logger } from '@nestjs/common';
import { EmergencyRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OCCUPIED_CASE_STATUSES } from './active-case-statuses';

const duplicateCrewLogger = new Logger('DuplicateActiveCrew');

/** Prisma client or interactive transaction — used for atomic crew checks. */
export type DbClient = PrismaService | Prisma.TransactionClient;

const OCCUPIED_STATUS_RANK: Record<string, number> = {
  ASSIGNED: 1,
  DISPATCHED: 2,
  EN_ROUTE: 3,
  ARRIVED_SCENE: 4,
  PATIENT_STABILIZED: 5,
  TRANSPORTING: 6,
  ARRIVED_HOSPITAL: 7,
};

function caseProgressScore(row: { status: string; updatedAt: Date }): number {
  const rank = OCCUPIED_STATUS_RANK[row.status] ?? 0;
  return rank * 1e15 + row.updatedAt.getTime();
}

type ActiveCrewRow = {
  id: string;
  trackingCode: string;
  status: EmergencyRequestStatus;
  driverId: string | null;
  nurseId: string | null;
  ambulanceId: string | null;
  updatedAt: Date;
};

function groupActiveByKey(
  rows: ActiveCrewRow[],
  key: 'driverId' | 'nurseId' | 'ambulanceId',
): Map<string, ActiveCrewRow[]> {
  const map = new Map<string, ActiveCrewRow[]>();
  for (const row of rows) {
    const id = row[key];
    if (!id) continue;
    const list = map.get(id) ?? [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}

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
/**
 * One driver/nurse/ambulance may only appear on a single in-progress case.
 * Stale duplicates are returned to PENDING without crew so dispatch can reassign.
 */
export async function resolveDuplicateActiveCrewCases(prisma: DbClient): Promise<number> {
  const active = await prisma.emergencyRequest.findMany({
    where: { status: { in: OCCUPIED_CASE_STATUSES } },
    select: {
      id: true,
      trackingCode: true,
      status: true,
      driverId: true,
      nurseId: true,
      ambulanceId: true,
      updatedAt: true,
    },
  });

  if (active.length < 2) return 0;

  const staleIds = new Set<string>();

  const markDuplicates = (groups: Map<string, typeof active>) => {
    for (const cases of groups.values()) {
      if (cases.length <= 1) continue;
      const sorted = [...cases].sort((a, b) => caseProgressScore(b) - caseProgressScore(a));
      const primary = sorted[0];
      for (const row of sorted.slice(1)) {
        staleIds.add(row.id);
        duplicateCrewLogger.warn(
          `Duplicate active crew: ${row.trackingCode} (${row.status}) shares crew with ${primary.trackingCode} (${primary.status}) — returning stale case to pending`,
        );
      }
    }
  };

  markDuplicates(groupActiveByKey(active, 'driverId'));
  markDuplicates(groupActiveByKey(active, 'nurseId'));
  markDuplicates(groupActiveByKey(active, 'ambulanceId'));

  if (!staleIds.size) return 0;

  const byId = new Map(active.map((row) => [row.id, row]));
  let repaired = 0;

  for (const staleId of staleIds) {
    const row = byId.get(staleId);
    if (!row) continue;

    await prisma.emergencyRequest.update({
      where: { id: staleId },
      data: {
        status: 'PENDING',
        driverId: null,
        nurseId: null,
        ambulanceId: null,
        assignedAt: null,
        dispatchedAt: null,
        statusLogs: {
          create: {
            fromStatus: row.status,
            toStatus: 'PENDING',
            notes:
              'System auto-resolved duplicate crew assignment — this case was returned to the pending queue. Reassign crew when ready.',
          },
        },
      },
    });
    repaired += 1;
  }

  return repaired;
}

export async function reconcileCrewOccupancy(prisma: DbClient): Promise<number> {
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
  prisma: DbClient,
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
  prisma: DbClient,
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
export async function occupyCrewForCase(prisma: DbClient, params: CrewAssignmentIds) {
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
export async function releaseCrewForCase(prisma: DbClient, params: CrewAssignmentIds) {
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
