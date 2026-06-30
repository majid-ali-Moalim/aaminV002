import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmergencyRequestStatus } from '@prisma/client';

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

const DEFAULT_SHIFTS = [
  { code: 'MORNING', name: 'Morning Shift', startTime: '06:00', endTime: '14:00', description: 'Day shift coverage', color: '#22C55E' },
  { code: 'EVENING', name: 'Evening Shift', startTime: '14:00', endTime: '22:00', description: 'Afternoon and evening coverage', color: '#3B82F6' },
  { code: 'NIGHT', name: 'Night Shift', startTime: '22:00', endTime: '06:00', description: 'Overnight coverage', color: '#6366F1' },
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
  if (defaultShift) return defaultShift;
  if (!typicalStartTime) return shifts?.[0]?.name ?? 'Morning Shift';
  const [h] = typicalStartTime.split(':').map(Number);
  if (shifts?.length) {
    const match = shifts.find((s) => {
      const [sh] = s.startTime.split(':').map(Number);
      if (s.endTime < s.startTime) {
        return h >= sh || h < Number(s.endTime.split(':')[0]);
      }
      const [eh] = s.endTime.split(':').map(Number);
      return h >= sh && h < eh;
    });
    if (match) return match.name;
  }
  if (h >= 6 && h < 14) return 'Morning Shift';
  if (h >= 14 && h < 22) return 'Evening Shift';
  return 'Night Shift';
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
    const delegate = (this.prisma as { workShift?: { count: () => Promise<number>; createMany: Function } }).workShift;
    if (!delegate) return [];
    try {
      const count = await delegate.count();
      if (count === 0) {
        await delegate.createMany({
          data: DEFAULT_SHIFTS.map((s) => ({
            code: s.code,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            description: s.description,
            color: s.color,
          })),
          skipDuplicates: true,
        });
      }
      return await this.listWorkShifts(false);
    } catch {
      return DEFAULT_SHIFTS.map((s, i) => ({ id: `default-${i}`, ...s, isActive: true, gracePeriodMins: 15, breakMinutes: 30 }));
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
    return this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: this.employeeInclude,
    });
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
    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const [employees, todayRecords, activeShifts] = await Promise.all([
      this.getActiveEmployees(),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.shiftRecord.count({ where: { endTime: null } }),
    ]);

    const presentIds = new Set(todayRecords.filter((r) => r.checkIn).map((r) => r.employeeId));
    const onDuty = employees.filter((e) =>
      ['ON_DUTY', 'AVAILABLE'].includes(e.shiftStatus),
    ).length;

    let absent = 0;
    employees.forEach((e) => {
      if (presentIds.has(e.id)) return;
      absent++;
    });

    const total = employees.length || 1;
    const attendanceRate = Math.round((presentIds.size / total) * 1000) / 10;

    return {
      employeesPresentToday: presentIds.size,
      employeesAbsentToday: absent,
      onDuty,
      attendanceRate,
      activeShifts,
      totalEmployees: total,
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

    let items = records.map((r) => ({
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
      };
    });

    const presentCount = items.filter((i) => i.present).length;
    const absentCount = items.filter((i) => i.absent).length;

    return {
      items,
      date: dayStart.toISOString().slice(0, 10),
      summary: {
        total: items.length,
        present: presentCount,
        absent: absentCount,
      },
    };
  }

  async getToday() {
    return this.getDayAttendance();
  }

  async getShiftManagement() {
    const [employees, openShifts, workShifts] = await Promise.all([
      this.getActiveEmployees(),
      this.prisma.shiftRecord.findMany({
        where: { endTime: null },
        include: { employee: { include: this.employeeInclude } },
      }),
      this.listWorkShifts(false),
    ]);

    const shifts = workShifts.map((s: any) => {
      const assigned = employees.filter(
        (e) => e.defaultShift === s.name || inferShiftLabel(e.typicalStartTime, e.defaultShift, workShifts) === s.name,
      );
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        description: s.description,
        gracePeriodMins: s.gracePeriodMins,
        breakMinutes: s.breakMinutes,
        color: s.color,
        status: s.isActive ? 'ACTIVE' : 'INACTIVE',
        isActive: s.isActive,
        assignedCount: assigned.length,
        assignedEmployees: assigned.slice(0, 8).map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          code: e.employeeCode,
        })),
      };
    });

    return { shifts, activeShiftSessions: openShifts.length, openSessions: openShifts };
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

    const records = await this.prisma.attendanceRecord.findMany({
      where: { date: { gte: start, lte: end } },
    });

    const total = records.length || 1;
    const late = records.filter((r) => r.status === 'LATE').length;
    const present = records.filter((r) => r.status === 'ON_TIME').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;

    const withHours = records.filter((r) => r.checkOut);
    const avgHours =
      withHours.length > 0
        ? withHours.reduce((s, r) => s + (hoursBetween(r.checkIn, r.checkOut) ?? 0), 0) /
          withHours.length
        : 0;

    const byDay = new Map<string, { present: number; late: number; absent: number }>();
    records.forEach((r) => {
      const key = startOfDay(r.date).toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { present: 0, late: 0, absent: 0 };
      if (r.status === 'LATE') cur.late++;
      else if (r.status === 'ABSENT') cur.absent++;
      else cur.present++;
      byDay.set(key, cur);
    });

    const trend = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, v]) => ({ date, ...v }));

    const [employees, workShifts] = await Promise.all([
      this.getActiveEmployees(),
      this.listWorkShifts(),
    ]);

    return {
      kpis: {
        attendanceRate: Math.round((present / total) * 1000) / 10,
        absenceRate: Math.round((absent / total) * 1000) / 10,
        lateRate: Math.round((late / total) * 1000) / 10,
        averageWorkingHours: Math.round(avgHours * 100) / 100,
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
