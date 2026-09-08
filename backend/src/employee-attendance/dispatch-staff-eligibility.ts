import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  enrichWithDispatchAssignability,
  filterDispatchAssignableEmployees,
  hasDispatchAssignableShiftStatus,
} from '../common/dispatch-assignability';
import { activeShiftLabel, isEmployeeOnActiveShift } from './shift-types';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function getPresentEmployeeIdsToday(prisma: PrismaService): Promise<Set<string>> {
  const dayStart = startOfDay();
  const dayEnd = endOfDay();
  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: { gte: dayStart, lte: dayEnd },
    },
    select: { employeeId: true },
  });
  return new Set(records.map((r) => r.employeeId));
}

export function enrichDispatchEligibleEmployee<
  T extends {
    id: string;
    status?: string | null;
    defaultShift?: string | null;
    typicalStartTime?: string | null;
    shiftStatus?: string | null;
    stationId?: string | null;
    assignedAmbulance?: { stationId?: string | null } | null;
  },
>(
  employee: T,
  presentIds: Set<string>,
  opts: {
    busyEmployeeIds?: Set<string>;
    stationId?: string | null;
    at?: Date;
  } = {},
) {
  const present = presentIds.has(employee.id);
  const enriched = enrichWithDispatchAssignability(employee, {
    ...opts,
    presentEmployeeIds: presentIds,
  });
  return {
    ...enriched,
    isPresent: present,
  };
}

/** Dispatch list: on current shift, not on case, not unavailable shift status. */
export function filterDispatchEligibleEmployees<
  T extends {
    id: string;
    status?: string | null;
    defaultShift?: string | null;
    typicalStartTime?: string | null;
    shiftStatus?: string | null;
    stationId?: string | null;
    assignedAmbulance?: { stationId?: string | null } | null;
  },
>(
  employees: T[],
  presentIds: Set<string>,
  opts: {
    busyEmployeeIds?: Set<string>;
    stationId?: string | null;
    at?: Date;
  } = {},
) {
  return filterDispatchAssignableEmployees(employees, {
    ...opts,
    presentEmployeeIds: presentIds,
  }).map((e) => ({
    ...e,
    isPresent: presentIds.has(e.id),
  }));
}

export async function assertDispatchEligibleStaff(
  prisma: PrismaService,
  employeeId: string,
  roleLabel: 'Driver' | 'Nurse',
) {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      defaultShift: true,
      typicalStartTime: true,
      shiftStatus: true,
      employeeRole: { select: { name: true } },
    },
  });
  if (!emp) throw new NotFoundException(`${roleLabel} not found`);

  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || roleLabel;

  if (!hasDispatchAssignableShiftStatus(emp.shiftStatus)) {
    throw new BadRequestException(
      `${name} is not available for dispatch (status: ${emp.shiftStatus ?? 'unknown'})`,
    );
  }

  const presentToday = await prisma.attendanceRecord.findFirst({
    where: {
      employeeId,
      date: { gte: startOfDay(), lte: endOfDay() },
    },
    select: { id: true },
  });
  if (!presentToday) {
    throw new BadRequestException(
      `${name} is not marked present in today's attendance and cannot be assigned`,
    );
  }

  if (!isEmployeeOnActiveShift(emp.defaultShift, emp.typicalStartTime)) {
    throw new BadRequestException(
      `${name} is not on the current ${activeShiftLabel()} shift and cannot be assigned`,
    );
  }
}
