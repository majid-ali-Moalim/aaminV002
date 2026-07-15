import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { activeShiftLabel, isEmployeeOnActiveShift, resolveShiftForEmployee } from './shift-types';

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
  T extends { id: string; defaultShift?: string | null; typicalStartTime?: string | null },
>(employee: T, presentIds: Set<string>, at = new Date()) {
  const present = presentIds.has(employee.id);
  const onCurrentShift = isEmployeeOnActiveShift(
    employee.defaultShift,
    employee.typicalStartTime,
    at,
  );
  const shift = resolveShiftForEmployee(employee.defaultShift, employee.typicalStartTime);
  return {
    ...employee,
    isPresent: present,
    onCurrentShift,
    shiftCode: shift.code,
    shiftName: shift.name,
    dispatchEligible: present && onCurrentShift,
  };
}

export function filterDispatchEligibleEmployees<
  T extends { id: string; defaultShift?: string | null; typicalStartTime?: string | null },
>(employees: T[], presentIds: Set<string>, at = new Date()) {
  return employees
    .filter(
      (e) => presentIds.has(e.id) && isEmployeeOnActiveShift(e.defaultShift, e.typicalStartTime, at),
    )
    .map((e) => enrichDispatchEligibleEmployee(e, presentIds, at));
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
      employeeRole: { select: { name: true } },
    },
  });
  if (!emp) throw new NotFoundException(`${roleLabel} not found`);

  const presentIds = await getPresentEmployeeIdsToday(prisma);
  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || roleLabel;

  if (!presentIds.has(employeeId)) {
    throw new BadRequestException(
      `${name} must be marked present in attendance before they can be dispatched`,
    );
  }

  if (!isEmployeeOnActiveShift(emp.defaultShift, emp.typicalStartTime)) {
    throw new BadRequestException(
      `${name} is not on the current ${activeShiftLabel()} shift and cannot be assigned`,
    );
  }
}
