import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmergencyRequestStatus } from '@prisma/client';
import {
  DEFAULT_SHIFTS,
  parseTimeOnDay,
  resolveShiftForEmployee,
  employeeMatchesWorkShift,
  fieldRoleBucket,
  isStaffEmployeeRole,
  isFieldShiftRole,
  staffRoleBucket,
  getActiveShiftCodeAt,
  activeShiftLabel,
  shiftAssignmentForCode,
  isEmployeeOnActiveShift,
  getAttendanceShiftBlockReason,
} from './shift-types';
import { getPresentEmployeeIdsToday } from './dispatch-staff-eligibility';

const ACTIVE_MISSION: EmergencyRequestStatus[] = [
  'REVIEWING',
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
];


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

function hoursBetween(checkIn: Date, checkOut: Date | null, allowOpen = false) {
  if (!checkOut && !allowOpen) return null;
  const end = checkOut ?? new Date();
  const ms = end.getTime() - checkIn.getTime();
  if (ms < 0) return null;
  return Math.round((ms / 3600000) * 100) / 100;
}

function formatClockTime(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString();
}

function attendanceStatusFromRecord(rec: { checkIn: Date } | undefined) {
  return rec?.checkIn ? 'Present' : 'Absent';
}

function inferShiftLabel(
  typicalStartTime?: string | null,
  defaultShift?: string | null,
  shifts?: { name: string; startTime: string; endTime: string }[],
) {
  const shift = resolveShiftForEmployee(defaultShift, typicalStartTime);
  const match = shifts?.find((s) => s.name.toLowerCase().includes(shift.code === 'NIGHT' ? 'night' : 'day'));
  if (match) return `${match.name} (${match.startTime} – ${match.endTime})`;
  return `${shift.name} (${shift.startTime} – ${shift.endTime})`;
}

@Injectable()
export class EmployeeAttendanceService {
  constructor(private prisma: PrismaService) {}

  /** Prisma client may lag schema until `npx prisma generate` — avoid 500s on new tables. */
  private async safeLeaveIdsForRange(dayStart: Date, dayEnd: Date): Promise<Set<string>> {
    const delegate = (this.prisma as { leaveRequest?: { findMany: (args: unknown) => Promise<{ employeeId: string }[]> } })
      .leaveRequest;
    if (!delegate) return new Set();
    try {
      const rows = await delegate.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart },
        },
        select: { employeeId: true },
      });
      return new Set(rows.map((r) => r.employeeId));
    } catch {
      return new Set();
    }
  }

  private async ensureDefaultShifts() {
    const delegate = (this.prisma as { workShift?: { count: () => Promise<number>; createMany: Function; upsert: Function } }).workShift;
    if (!delegate) return [];
    try {
      for (const s of DEFAULT_SHIFTS) {
        await delegate.upsert({
          where: { code: s.code },
          create: {
            code: s.code,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            description: s.description,
            color: s.color,
            gracePeriodMins: 15,
            breakMinutes: 0,
            isActive: true,
          },
          update: {
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            description: s.description,
            color: s.color,
            breakMinutes: 0,
          },
        });
      }
      return await this.listWorkShifts(false);
    } catch {
      return DEFAULT_SHIFTS.map((s, i) => ({ id: `default-${i}`, ...s, isActive: true, gracePeriodMins: 15, breakMinutes: 0 }));
    }
  }

  async listWorkShifts(activeOnly = true) {
    const delegate = (this.prisma as { workShift?: { findMany: Function } }).workShift;
    if (!delegate) return (await this.ensureDefaultShifts());
    try {
      return await delegate.findMany({
        where: activeOnly ? { isActive: true } : {},
        orderBy: [{ startTime: 'asc' }],
      });
    } catch {
      return await this.ensureDefaultShifts();
    }
  }

  async createWorkShift(body: {
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    description?: string;
    gracePeriodMins?: number;
    breakMinutes?: number;
    color?: string;
  }, userId: string) {
    const delegate = (this.prisma as { workShift?: { create: Function } }).workShift;
    if (!delegate) throw new BadRequestException('Shift management is not available');
    const created = await delegate.create({
      data: {
        code: body.code.trim().toUpperCase(),
        name: body.name.trim(),
        startTime: body.startTime,
        endTime: body.endTime,
        description: body.description ?? null,
        gracePeriodMins: body.gracePeriodMins ?? 15,
        breakMinutes: body.breakMinutes ?? 0,
        color: body.color ?? null,
      },
    });
    await this.logAudit(userId, 'Work shift created', created.name, created.id);
    return created;
  }

  async updateWorkShift(
    id: string,
    body: Partial<{
      code: string;
      name: string;
      startTime: string;
      endTime: string;
      description: string;
      gracePeriodMins: number;
      breakMinutes: number;
      color: string;
      isActive: boolean;
    }>,
    userId: string,
  ) {
    const delegate = (this.prisma as { workShift?: { findUnique: Function; update: Function } }).workShift;
    if (!delegate) throw new BadRequestException('Shift management is not available');
    const existing = await delegate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Shift not found');
    const updated = await delegate.update({
      where: { id },
      data: {
        ...(body.code ? { code: body.code.trim().toUpperCase() } : {}),
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.startTime ? { startTime: body.startTime } : {}),
        ...(body.endTime ? { endTime: body.endTime } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.gracePeriodMins !== undefined ? { gracePeriodMins: body.gracePeriodMins } : {}),
        ...(body.breakMinutes !== undefined ? { breakMinutes: body.breakMinutes } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    await this.logAudit(userId, 'Work shift updated', updated.name, id);
    return updated;
  }

  async deleteWorkShift(id: string, userId: string) {
    return this.updateWorkShift(id, { isActive: false }, userId);
  }

  private employeeInclude = {
    employeeRole: true,
    department: true,
    station: true,
  };

  private async logAudit(userId: string, action: string, detail: string, entityId?: string) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: `${action}: ${detail}`,
          entityType: 'ATTENDANCE',
          entityId: entityId ?? null,
        },
      });
    } catch {
      /* non-blocking */
    }
  }

  private async getActiveEmployees() {
    const rows = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: this.employeeInclude,
    });
    return rows.filter((e) => isStaffEmployeeRole(e.employeeRole?.name));
  }

  private countDaysInRange(start: Date, end: Date) {
    const from = startOfDay(start);
    const to = startOfDay(end);
    if (to.getTime() < from.getTime()) return 0;
    return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  }

  private async getOnMissionEmployeeIds() {
    const active = await this.prisma.emergencyRequest.findMany({
      where: { status: { in: ACTIVE_MISSION } },
      select: { driverId: true, nurseId: true, dispatcherId: true },
    });
    const ids = new Set<string>();
    active.forEach((m) => {
      if (m.driverId) ids.add(m.driverId);
      if (m.nurseId) ids.add(m.nurseId);
      if (m.dispatcherId) ids.add(m.dispatcherId);
    });
    return ids;
  }

  private async getApprovedLeaveToday() {
    return [...(await this.safeLeaveIdsForRange(startOfDay(), endOfDay()))].map((employeeId) => ({
      employeeId,
    }));
  }

  async getOverview() {
    const todayPresence = await this.getTodayStaffPresence();
    const activeShifts = await this.prisma.shiftRecord.count({ where: { endTime: null } });
    const onDuty = (await this.getActiveEmployees()).filter((e) =>
      ['ON_DUTY', 'AVAILABLE'].includes(e.shiftStatus),
    ).length;

    return {
      employeesPresentToday: todayPresence.presentEmployees,
      employeesAbsentToday: todayPresence.absentEmployees,
      onDuty,
      attendanceRate: todayPresence.presentPercentage,
      activeShifts,
      totalEmployees: todayPresence.totalEmployees,
      todayPresence,
    };
  }

  async getTodayStaffPresence() {
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const [employees, todayRecords] = await Promise.all([
      this.getActiveEmployees(),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
        select: { employeeId: true, checkIn: true },
      }),
    ]);

    const presentIds = new Set(
      todayRecords.filter((r) => r.checkIn).map((r) => r.employeeId),
    );

    type RoleStats = { total: number; present: number; absent: number };
    const emptyRole = (): RoleStats => ({ total: 0, present: 0, absent: 0 });
    const byRole: Record<'drivers' | 'nurses' | 'dispatchers' | 'admins', RoleStats> = {
      drivers: emptyRole(),
      nurses: emptyRole(),
      dispatchers: emptyRole(),
      admins: emptyRole(),
    };

    const presentList: {
      id: string;
      name: string;
      code: string;
      role: string;
      roleBucket: ReturnType<typeof staffRoleBucket>;
    }[] = [];
    const absentList: typeof presentList = [];

    for (const e of employees) {
      const bucket = staffRoleBucket(e.employeeRole?.name);
      if (bucket === 'other') continue;

      const name = `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeCode || 'Employee';
      const row = {
        id: e.id,
        name,
        code: e.employeeCode ?? e.id,
        role: e.employeeRole?.name ?? '—',
        roleBucket: bucket,
      };

      byRole[bucket].total++;
      if (presentIds.has(e.id)) {
        byRole[bucket].present++;
        presentList.push(row);
      } else {
        byRole[bucket].absent++;
        absentList.push(row);
      }
    }

    const fieldStaff = {
      total: byRole.drivers.total + byRole.nurses.total + byRole.dispatchers.total,
      present: byRole.drivers.present + byRole.nurses.present + byRole.dispatchers.present,
      absent: byRole.drivers.absent + byRole.nurses.absent + byRole.dispatchers.absent,
    };
    const fieldTotal = fieldStaff.total || 1;

    const totalEmployees = presentList.length + absentList.length;
    const presentEmployees = presentList.length;
    const absentEmployees = absentList.length;
    const total = totalEmployees || 1;

    return {
      date: todayStart.toISOString().slice(0, 10),
      presentEmployees,
      absentEmployees,
      totalEmployees,
      presentPercentage: Math.round((presentEmployees / total) * 1000) / 10,
      absentPercentage: Math.round((absentEmployees / total) * 1000) / 10,
      byRole,
      fieldStaff: {
        ...fieldStaff,
        presentPercentage: Math.round((fieldStaff.present / fieldTotal) * 1000) / 10,
        absentPercentage: Math.round((fieldStaff.absent / fieldTotal) * 1000) / 10,
      },
      presentEmployeesList: presentList,
      absentEmployeesList: absentList,
    };
  }

  async getRecords(filters: {
    search?: string;
    role?: string;
    departmentId?: string;
    shift?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.startDate || filters.endDate) {
      where.date = {
        gte: filters.startDate ? new Date(filters.startDate) : undefined,
        lte: filters.endDate ? new Date(filters.endDate) : undefined,
      };
    }
    if (filters.status) {
      where.status = filters.status === 'Present' ? 'ON_TIME' : filters.status;
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: { employee: { include: this.employeeInclude } },
      orderBy: [{ date: 'desc' }, { checkIn: 'desc' }],
      take: 500,
    });

    let items = records
      .filter((r) => isStaffEmployeeRole(r.employee.employeeRole?.name))
      .map((r) => ({
      id: r.id,
      employeeId: r.employee.employeeCode ?? r.employeeId,
      employeeName: `${r.employee.firstName ?? ''} ${r.employee.lastName ?? ''}`.trim(),
      role: r.employee.employeeRole?.name ?? '—',
      department: r.employee.department?.name ?? '—',
      shift: inferShiftLabel(r.employee.typicalStartTime),
      clockIn: r.checkIn,
      clockOut: r.checkOut,
      totalHours: hoursBetween(r.checkIn, r.checkOut),
      attendanceStatus: attendanceStatusFromRecord(r),
      attendanceDate: r.date,
      notes: r.notes,
      rawStatus: r.status,
    }));

    if (filters.role) {
      items = items.filter((i) =>
        i.role.toLowerCase().includes(filters.role!.toLowerCase()),
      );
    }
    if (filters.departmentId) {
      items = items.filter(
        (i) =>
          records.find((r) => r.id === i.id)?.employee.departmentId === filters.departmentId,
      );
    }
    if (filters.shift) {
      items = items.filter((i) => i.shift === filters.shift);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.employeeName.toLowerCase().includes(q) ||
          String(i.employeeId).toLowerCase().includes(q),
      );
    }

    return { items, total: items.length };
  }

  private async getApprovedLeaveForRange(dayStart: Date, dayEnd: Date) {
    const ids = await this.safeLeaveIdsForRange(dayStart, dayEnd);
    return [...ids].map((employeeId) => ({ employeeId }));
  }

  async getDayAttendance(dateStr?: string) {
    const day = dateStr
      ? (() => {
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, m - 1, d);
        })()
      : new Date();
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const isToday = startOfDay(new Date()).getTime() === dayStart.getTime();

    const [employees, records, workShifts] = await Promise.all([
      this.getActiveEmployees(),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        include: { employee: { include: this.employeeInclude } },
      }),
      this.listWorkShifts(),
    ]);

    const recordByEmp = new Map(records.map((r) => [r.employeeId, r]));

    const items = employees.map((e) => {
      const rec = recordByEmp.get(e.id);
      const present = Boolean(rec?.checkIn);
      const status = present ? 'Present' : 'Absent';
      const openSession = present && !rec?.checkOut && isToday;
      const onCurrentShift = isEmployeeOnActiveShift(e.defaultShift, e.typicalStartTime);
      const requiresShiftMatch = isFieldShiftRole(e.employeeRole?.name);
      const canMarkAttendance =
        !isToday || !requiresShiftMatch || onCurrentShift;

      return {
        recordId: rec?.id ?? null,
        employeeDbId: e.id,
        employeeId: e.employeeCode ?? e.id,
        employeeName: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
        role: e.employeeRole?.name ?? '—',
        department: e.department?.name ?? '—',
        phone: e.phone ?? '—',
        shift: inferShiftLabel(e.typicalStartTime, e.defaultShift, workShifts),
        status,
        present,
        absent: !present,
        clockIn: formatClockTime(rec?.checkIn),
        clockOut: formatClockTime(rec?.checkOut),
        totalHours: rec?.checkIn
          ? hoursBetween(rec.checkIn, rec.checkOut ?? null, openSession)
          : null,
        hoursInProgress: openSession,
        shiftStatus: e.shiftStatus,
        profilePhoto: e.profilePhoto,
        onCurrentShift,
        requiresShiftMatch,
        canMarkAttendance,
        attendanceBlockReason: canMarkAttendance
          ? null
          : getAttendanceShiftBlockReason(
              e.employeeRole?.name,
              e.defaultShift,
              e.typicalStartTime,
            ),
      };
    });

    const presentCount = items.filter((i) => i.present).length;
    const absentCount = items.filter((i) => i.absent).length;
    const totalCount = items.length || 1;
    const presentPercentage = Math.round((presentCount / totalCount) * 1000) / 10;
    const absentPercentage = Math.round((absentCount / totalCount) * 1000) / 10;

    const missedShiftAlerts = await this.computeMissedShiftAlerts(
      employees,
      recordByEmp,
      dayStart,
      dayEnd,
      isToday,
    );

    return {
      items,
      date: dayStart.toISOString().slice(0, 10),
      isToday,
      activeShiftLabel: activeShiftLabel(),
      activeShiftCode: getActiveShiftCodeAt(),
      summary: {
        total: items.length,
        present: presentCount,
        absent: absentCount,
        presentPercentage,
        absentPercentage,
      },
      missedShiftAlerts,
    };
  }

  async getToday() {
    return this.getDayAttendance();
  }

  async getShiftManagement() {
    await this.ensureDefaultShifts();
    const [employees, openShifts, workShifts, presentIds] = await Promise.all([
      this.getActiveEmployees(),
      this.prisma.shiftRecord.findMany({
        where: { endTime: null },
        include: { employee: { include: this.employeeInclude } },
      }),
      this.listWorkShifts(false),
      getPresentEmployeeIdsToday(this.prisma),
    ]);

    const fieldStaff = employees.map((e) => {
        const shift = resolveShiftForEmployee(e.defaultShift, e.typicalStartTime);
        const present = presentIds.has(e.id);
        const onCurrentShift = isEmployeeOnActiveShift(e.defaultShift, e.typicalStartTime);
        return {
          id: e.id,
          name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
          code: e.employeeCode,
          role: e.employeeRole?.name ?? 'Staff',
          roleBucket: staffRoleBucket(e.employeeRole?.name),
          shiftCode: shift.code,
          shiftName: shift.name,
          present,
          onCurrentShift,
          dispatchEligible: present && onCurrentShift,
        };
      });

    const shifts = workShifts.map((s: any) => {
      const assigned = employees.filter((e) =>
        employeeMatchesWorkShift(e.defaultShift, e.typicalStartTime, s),
      );
      const roleBreakdown = {
        drivers: assigned.filter((e) => staffRoleBucket(e.employeeRole?.name) === 'drivers').length,
        nurses: assigned.filter((e) => staffRoleBucket(e.employeeRole?.name) === 'nurses').length,
        dispatchers: assigned.filter((e) => staffRoleBucket(e.employeeRole?.name) === 'dispatchers').length,
        admins: assigned.filter((e) => staffRoleBucket(e.employeeRole?.name) === 'admins').length,
      };
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        description: s.description,
        gracePeriodMins: s.gracePeriodMins,
        color: s.color,
        status: s.isActive ? 'ACTIVE' : 'INACTIVE',
        isActive: s.isActive,
        durationHours: 12,
        assignedCount: assigned.length,
        roleBreakdown,
        assignedEmployees: assigned.map((e) => {
          const present = presentIds.has(e.id);
          const onCurrentShift = isEmployeeOnActiveShift(e.defaultShift, e.typicalStartTime);
          return {
            id: e.id,
            name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
            code: e.employeeCode,
            role: e.employeeRole?.name ?? 'Staff',
            roleBucket: staffRoleBucket(e.employeeRole?.name),
            present,
            onCurrentShift,
            dispatchEligible: present && onCurrentShift,
          };
        }),
      };
    });

    return {
      shifts,
      fieldStaff,
      activeShiftCode: getActiveShiftCodeAt(),
      activeShiftLabel: activeShiftLabel(),
      activeShiftSessions: openShifts.length,
      openSessions: openShifts,
    };
  }

  async assignEmployeeShift(employeeId: string, shiftCode: 'DAY' | 'NIGHT', userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { employeeRole: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const bucket = fieldRoleBucket(employee.employeeRole?.name);
    if (bucket === 'other') {
      throw new BadRequestException('Only drivers, nurses, and dispatchers can be assigned to field shifts');
    }

    const assignment = shiftAssignmentForCode(shiftCode);
    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        defaultShift: assignment.defaultShift,
        typicalStartTime: assignment.typicalStartTime,
      },
      include: { employeeRole: true },
    });

    await this.logAudit(
      userId,
      'Employee shift reassigned',
      `${updated.firstName} ${updated.lastName} → ${assignment.shiftName}`,
      employeeId,
    );

    return {
      id: updated.id,
      name: `${updated.firstName ?? ''} ${updated.lastName ?? ''}`.trim(),
      role: updated.employeeRole?.name,
      shiftCode: assignment.shiftCode,
      shiftName: assignment.shiftName,
      defaultShift: assignment.defaultShift,
      typicalStartTime: assignment.typicalStartTime,
    };
  }

  async getApprovals(status?: string) {
    const delegate = (this.prisma as { attendanceApprovalRequest?: { findMany: Function } })
      .attendanceApprovalRequest;
    if (!delegate) return { items: [] };
    try {
      const where = status ? { status: status.toUpperCase() } : {};
      const items = await delegate.findMany({
        where,
        include: { employee: { include: this.employeeInclude } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return {
        items: items.map((a: any) => ({
          id: a.id,
          employee: `${a.employee.firstName} ${a.employee.lastName}`,
          employeeCode: a.employee.employeeCode,
          requestType: a.requestType,
          status: a.status,
          comment: a.comment,
          reviewerComment: a.reviewerComment,
          createdAt: a.createdAt,
        })),
      };
    } catch {
      return { items: [] };
    }
  }

  async reviewApproval(
    id: string,
    action: 'approve' | 'reject',
    reviewerComment: string | undefined,
    userId: string,
  ) {
    const req = await this.prisma.attendanceApprovalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Approval request not found');
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.attendanceApprovalRequest.update({
      where: { id },
      data: { status, reviewerComment: reviewerComment ?? null },
    });
    await this.logAudit(userId, `Attendance ${status}`, req.requestType, id);
    return updated;
  }

  async getLeaveRequests(status?: string) {
    const where = status ? { status: status.toUpperCase() } : {};
    const items = await this.prisma.leaveRequest.findMany({
      where,
      include: { employee: { include: this.employeeInclude } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      items: items.map((l) => ({
        id: l.id,
        employee: `${l.employee.firstName} ${l.employee.lastName}`,
        employeeCode: l.employee.employeeCode,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        status: l.status,
        notes: l.notes,
      })),
    };
  }

  async reviewLeave(
    id: string,
    action: 'approve' | 'reject',
    reviewerComment: string | undefined,
    userId: string,
  ) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Leave request not found');
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    await this.prisma.leaveRequest.update({
      where: { id },
      data: { status, reviewerComment: reviewerComment ?? null },
    });
    if (action === 'approve') {
      await this.prisma.employee.update({
        where: { id: req.employeeId },
        data: { shiftStatus: 'ON_LEAVE' },
      });
    }
    const updated = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    });
    await this.logAudit(userId, `Leave ${status}`, req.leaveType, id);
    return updated;
  }

  async getOvertime(status?: string) {
    const where = status ? { status: status.toUpperCase() } : {};
    const items = await this.prisma.overtimeRecord.findMany({
      where,
      include: { employee: { include: this.employeeInclude } },
      orderBy: { date: 'desc' },
      take: 100,
    });
    return {
      items: items.map((o) => ({
        id: o.id,
        employee: `${o.employee.firstName} ${o.employee.lastName}`,
        shiftHours: o.shiftHours,
        overtimeHours: o.overtimeHours,
        date: o.date,
        status: o.status,
      })),
    };
  }

  async reviewOvertime(id: string, action: 'approve' | 'reject', userId: string) {
    const rec = await this.prisma.overtimeRecord.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException('Overtime record not found');
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.overtimeRecord.update({
      where: { id },
      data: { status },
    });
    await this.logAudit(userId, `Overtime ${status}`, 'overtime', id);
    return updated;
  }

  async getAnalytics(range: { startDate?: string; endDate?: string }) {
    const start = range.startDate ? new Date(range.startDate) : startOfDay(new Date(Date.now() - 30 * 86400000));
    const end = range.endDate ? new Date(range.endDate) : endOfDay();
    const todayEnd = endOfDay(new Date());
    const effectiveEnd = end.getTime() > todayEnd.getTime() ? todayEnd : end;

    const [employees, records, workShifts] = await Promise.all([
      this.getActiveEmployees(),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: startOfDay(start), lte: effectiveEnd } },
      }),
      this.listWorkShifts(),
    ]);

    const staffIds = new Set(employees.map((e) => e.id));
    const staffRecords = records.filter((r) => staffIds.has(r.employeeId));

    const totalDays = this.countDaysInRange(start, effectiveEnd);
    const totalSlots = totalDays * employees.length || 1;
    const presentSlots = staffRecords.filter((r) => r.checkIn).length;
    const absentSlots = Math.max(0, totalSlots - presentSlots);

    const late = staffRecords.filter((r) => r.status === 'LATE').length;
    const present = staffRecords.filter((r) => r.checkIn).length;

    const withHours = staffRecords.filter((r) => r.checkOut);
    const avgHours =
      withHours.length > 0
        ? withHours.reduce((s, r) => s + (hoursBetween(r.checkIn, r.checkOut) ?? 0), 0) /
          withHours.length
        : 0;

    const byDay = new Map<string, { present: number; late: number; absent: number }>();
    for (let d = startOfDay(start); d.getTime() <= startOfDay(effectiveEnd).getTime(); d = new Date(d.getTime() + 86400000)) {
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { present: 0, late: 0, absent: 0 });
    }
    staffRecords.forEach((r) => {
      const key = startOfDay(r.date).toISOString().slice(0, 10);
      const cur = byDay.get(key);
      if (!cur) return;
      if (r.status === 'LATE') cur.late++;
      else if (r.checkIn) cur.present++;
    });
    byDay.forEach((cur, key) => {
      const dayPresent = cur.present + cur.late;
      cur.absent = Math.max(0, employees.length - dayPresent);
    });

    const trend = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, v]) => ({ date, ...v }));

    return {
      kpis: {
        attendanceRate: Math.round((presentSlots / totalSlots) * 1000) / 10,
        absenceRate: Math.round((absentSlots / totalSlots) * 1000) / 10,
        lateRate: present > 0 ? Math.round((late / present) * 1000) / 10 : 0,
        averageWorkingHours: Math.round(avgHours * 100) / 100,
        totalPresentDays: presentSlots,
        totalAbsentDays: absentSlots,
        totalDays,
        totalEmployees: employees.length,
      },
      charts: {
        attendanceTrend: trend,
        absenceTrend: trend.map((t) => ({ date: t.date, value: t.absent })),
        lateTrend: trend.map((t) => ({ date: t.date, value: t.late })),
        shiftUtilization: workShifts.map((s: { name: string }) => ({
          name: s.name,
          value: employees.filter(
            (e) =>
              e.defaultShift === s.name ||
              inferShiftLabel(e.typicalStartTime, e.defaultShift, workShifts) === s.name,
          ).length,
        })),
      },
    };
  }

  async getAttendanceScores(range: { startDate?: string; endDate?: string; role?: string }) {
    const start = range.startDate ? new Date(range.startDate) : startOfDay(new Date(Date.now() - 30 * 86400000));
    const end = range.endDate ? new Date(range.endDate) : endOfDay();
    const todayEnd = endOfDay(new Date());
    const effectiveEnd = end.getTime() > todayEnd.getTime() ? todayEnd : end;
    const totalDays = this.countDaysInRange(start, effectiveEnd);

    let employees = await this.getActiveEmployees();
    if (range.role) {
      const q = range.role.toLowerCase();
      employees = employees.filter((e) => (e.employeeRole?.name ?? '').toLowerCase().includes(q));
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        date: { gte: startOfDay(start), lte: effectiveEnd },
        employeeId: { in: employees.map((e) => e.id) },
      },
      select: { employeeId: true, date: true, checkIn: true },
    });

    const presentDaysByEmp = new Map<string, Set<string>>();
    for (const r of records) {
      if (!r.checkIn) continue;
      const key = startOfDay(r.date).toISOString().slice(0, 10);
      const set = presentDaysByEmp.get(r.employeeId) ?? new Set<string>();
      set.add(key);
      presentDaysByEmp.set(r.employeeId, set);
    }

    const employeeScores = employees.map((e) => {
      const presentDays = presentDaysByEmp.get(e.id)?.size ?? 0;
      const absentDays = Math.max(0, totalDays - presentDays);
      const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 1000) / 10 : 0;
      const absencePercentage = totalDays > 0 ? Math.round((absentDays / totalDays) * 1000) / 10 : 0;
      return {
        employeeId: e.id,
        employeeCode: e.employeeCode ?? e.id,
        employeeName: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
        role: e.employeeRole?.name ?? '—',
        roleBucket: staffRoleBucket(e.employeeRole?.name),
        department: e.department?.name ?? '—',
        presentDays,
        absentDays,
        totalDays,
        attendancePercentage,
        absencePercentage,
        score: attendancePercentage,
      };
    });

    employeeScores.sort((a, b) => b.score - a.score || a.employeeName.localeCompare(b.employeeName));

    const totalPresentDays = employeeScores.reduce((s, e) => s + e.presentDays, 0);
    const totalAbsentDays = employeeScores.reduce((s, e) => s + e.absentDays, 0);
    const totalSlots = totalDays * employees.length || 1;
    const averageAttendanceRate = Math.round((totalPresentDays / totalSlots) * 1000) / 10;

    const byRole: Record<string, { count: number; averageScore: number; presentDays: number; absentDays: number }> = {};
    for (const row of employeeScores) {
      const bucket = row.roleBucket;
      const cur = byRole[bucket] ?? { count: 0, averageScore: 0, presentDays: 0, absentDays: 0 };
      cur.count++;
      cur.presentDays += row.presentDays;
      cur.absentDays += row.absentDays;
      byRole[bucket] = cur;
    }
    for (const [key, val] of Object.entries(byRole)) {
      const roleSlots = totalDays * val.count || 1;
      val.averageScore = Math.round((val.presentDays / roleSlots) * 1000) / 10;
      byRole[key] = val;
    }

    const todayPresence = await this.getTodayStaffPresence();

    return {
      range: {
        startDate: startOfDay(start).toISOString().slice(0, 10),
        endDate: startOfDay(effectiveEnd).toISOString().slice(0, 10),
        totalDays,
      },
      summary: {
        totalEmployees: employees.length,
        totalPresentDays,
        totalAbsentDays,
        averageAttendanceRate,
        averageAbsenceRate: Math.round((totalAbsentDays / totalSlots) * 1000) / 10,
      },
      todayPresence,
      byRole,
      employees: employeeScores,
    };
  }

  async getRoleMonitoring(roleKey: string) {
    const roleMap: Record<string, string> = {
      dispatcher: 'Dispatcher',
      driver: 'Driver',
      nurse: 'Nurse',
      admin: 'Administrator',
    };
    const roleName = roleMap[roleKey.toLowerCase()] ?? roleKey;
    const [employees, onMissionIds] = await Promise.all([
      this.prisma.employee.findMany({
        where: { status: 'ACTIVE', employeeRole: { name: roleName } },
        include: this.employeeInclude,
      }),
      this.getOnMissionEmployeeIds(),
    ]);

    const available = employees.filter((e) =>
      ['AVAILABLE', 'ON_DUTY'].includes(e.shiftStatus),
    ).length;
    const onMission = employees.filter((e) => onMissionIds.has(e.id)).length;
    const offDuty = employees.filter((e) => e.shiftStatus === 'OFF_DUTY').length;
    const online = employees.filter((e) => e.shiftStatus !== 'OFF_DUTY').length;

    return {
      role: roleName,
      total: employees.length,
      online,
      available,
      onMission,
      offDuty,
      active: onMission + available,
      shiftCoverage: employees.length
        ? Math.round(((onMission + available) / employees.length) * 100)
        : 0,
      employees: employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        code: e.employeeCode,
        shiftStatus: e.shiftStatus,
        onMission: onMissionIds.has(e.id),
      })),
    };
  }

  async markManualAttendance(
    employeeId: string,
    dateStr: string | undefined,
    action: 'present' | 'absent',
    userId: string,
    checkInIso?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { employeeRole: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const day = dateStr
      ? (() => {
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, m - 1, d);
        })()
      : new Date();
    const markAt = checkInIso ? new Date(checkInIso) : new Date();
    const markingToday = startOfDay(day).getTime() === startOfDay(new Date()).getTime();

    if (markingToday) {
      const blockReason = getAttendanceShiftBlockReason(
        employee.employeeRole?.name,
        employee.defaultShift,
        employee.typicalStartTime,
        markAt,
      );
      if (blockReason) {
        throw new BadRequestException(blockReason);
      }
    }

    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { employeeId, date: { gte: dayStart, lte: dayEnd } },
    });

    if (action === 'present') {
      const checkIn = checkInIso ? new Date(checkInIso) : new Date();
      let record;
      if (existing) {
        record = await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { checkIn, status: 'ON_TIME', notes: 'Marked present by admin' },
        });
      } else {
        record = await this.prisma.attendanceRecord.create({
          data: {
            employeeId,
            date: dayStart,
            checkIn,
            status: 'ON_TIME',
            notes: 'Marked present by admin',
          },
        });
      }

      await this.prisma.employee.update({
        where: { id: employeeId },
        data: { shiftStatus: 'AVAILABLE' },
      });

      await this.logAudit(userId, 'Manual attendance — present', employee.employeeCode ?? employeeId, record.id);
      return record;
    }

    if (existing) {
      await this.prisma.attendanceRecord.delete({ where: { id: existing.id } });
    }

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { shiftStatus: 'UNAVAILABLE' },
    });

    await this.logAudit(userId, 'Manual attendance — absent', employee.employeeCode ?? employeeId, employeeId);
    return { employeeId, status: 'Absent', date: dayStart.toISOString().slice(0, 10) };
  }

  private async computeMissedShiftAlerts(
    employees: Awaited<ReturnType<EmployeeAttendanceService['getActiveEmployees']>>,
    recordByEmp: Map<string, { checkIn: Date | null }>,
    dayStart: Date,
    dayEnd: Date,
    isToday: boolean,
  ) {
    const now = new Date();
    const dateKey = dayStart.toISOString().slice(0, 10);
    if (dayStart.getTime() > startOfDay(now).getTime()) return [];

    const onLeave = await this.safeLeaveIdsForRange(dayStart, dayEnd);
    const alerts: {
      alertKey: string;
      employeeId: string;
      employeeName: string;
      role: string;
      shiftName: string;
      shiftWindow: string;
      date: string;
      message: string;
    }[] = [];

    for (const emp of employees) {
      if (!isFieldShiftRole(emp.employeeRole?.name)) continue;
      if (onLeave.has(emp.id)) continue;

      const rec = recordByEmp.get(emp.id);
      if (rec?.checkIn) continue;

      const shift = resolveShiftForEmployee(emp.defaultShift, emp.typicalStartTime);
      const shiftStart = parseTimeOnDay(shift.startTime, dayStart);
      const graceEnd = new Date(shiftStart.getTime() + 15 * 60 * 1000);

      if (isToday && now < graceEnd) continue;

      const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.employeeCode || 'Employee';
      const role = emp.employeeRole?.name ?? 'Staff';
      const shiftWindow = `${shift.startTime} – ${shift.endTime}`;

      alerts.push({
        alertKey: `${emp.id}-${dateKey}`,
        employeeId: emp.id,
        employeeName: name,
        role,
        shiftName: shift.name,
        shiftWindow,
        date: dateKey,
        message: `${name}, ${role} did not present at their ${shift.name} shift (${shiftWindow}) on ${dateKey}.`,
      });
    }

    return alerts;
  }

  async updateRecord(id: string, body: Record<string, unknown>, userId: string) {
    const record = await this.prisma.attendanceRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Attendance record not found');

    if (body.checkOut && !record.checkIn) {
      throw new BadRequestException('Cannot clock out before clock in');
    }

    const data: Record<string, unknown> = {};
    if (typeof body.status === 'string') data.status = body.status;
    if (typeof body.notes === 'string') data.notes = body.notes;
    if (body.checkIn) data.checkIn = new Date(body.checkIn as string);
    if (body.checkOut) data.checkOut = new Date(body.checkOut as string);

    const updated = await this.prisma.attendanceRecord.update({
      where: { id },
      data,
      include: { employee: { include: this.employeeInclude } },
    });

    await this.logAudit(userId, 'Attendance record updated', `Record ${id}`, id);
    return updated;
  }

  async buildExportPayload(body: { type: string; startDate?: string; endDate?: string }) {
    const { items } = await this.getRecords({
      startDate: body.startDate,
      endDate: body.endDate,
    });
    return { type: body.type, rows: items, generatedAt: new Date().toISOString() };
  }

  /** Seed demo rows when tables are empty (dev-friendly) */
  async ensureDemoData() {
    const [approvals, leaves] = await Promise.all([
      this.prisma.attendanceApprovalRequest.count(),
      this.prisma.leaveRequest.count(),
    ]);
    if (approvals > 0 && leaves > 0) return;

    const emp = await this.prisma.employee.findFirst({
      where: { status: 'ACTIVE' },
      include: { employeeRole: true },
    });
    if (!emp) return;

    if (approvals === 0) {
      await this.prisma.attendanceApprovalRequest.createMany({
        data: [
          {
            employeeId: emp.id,
            requestType: 'Missing Clock In',
            status: 'PENDING',
            comment: 'Forgot to clock in after night shift',
          },
          {
            employeeId: emp.id,
            requestType: 'Late Arrival Explanation',
            status: 'PENDING',
            comment: 'Traffic delay on main road',
          },
        ],
      });
    }

    if (leaves === 0) {
      const start = startOfDay();
      const end = new Date(start);
      end.setDate(end.getDate() + 3);
      await this.prisma.leaveRequest.create({
        data: {
          employeeId: emp.id,
          leaveType: 'Annual Leave',
          startDate: start,
          endDate: end,
          status: 'PENDING',
        },
      });
    }

    const otCount = await this.prisma.overtimeRecord.count();
    if (otCount === 0) {
      await this.prisma.overtimeRecord.create({
        data: {
          employeeId: emp.id,
          date: startOfDay(),
          shiftHours: 8,
          overtimeHours: 2,
          status: 'PENDING',
        },
      });
    }
  }
}
