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

const SHIFT_DEFINITIONS = [
  { id: 'morning', name: 'Morning Shift', startTime: '06:00', endTime: '14:00', status: 'ACTIVE' },
  { id: 'evening', name: 'Evening Shift', startTime: '14:00', endTime: '22:00', status: 'ACTIVE' },
  { id: 'night', name: 'Night Shift', startTime: '22:00', endTime: '06:00', status: 'ACTIVE' },
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

function hoursBetween(checkIn: Date, checkOut: Date | null) {
  if (!checkOut) return null;
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round((ms / 3600000) * 100) / 100;
}

function inferShiftLabel(typicalStartTime?: string | null) {
  if (!typicalStartTime) return 'Morning Shift';
  const [h] = typicalStartTime.split(':').map(Number);
  if (h >= 6 && h < 14) return 'Morning Shift';
  if (h >= 14 && h < 22) return 'Evening Shift';
  return 'Night Shift';
}

function mapRecordStatus(status: string) {
  const m: Record<string, string> = {
    ON_TIME: 'Present',
    LATE: 'Late',
    ABSENT: 'Absent',
    ON_LEAVE: 'On Leave',
    ON_MISSION: 'On Mission',
    BREAK: 'Break',
    OFF_DUTY: 'Off Duty',
  };
  return m[status] ?? status;
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
    const [employees, todayRecords, onMissionIds, onLeaveToday, activeShifts] =
      await Promise.all([
        this.getActiveEmployees(),
        this.prisma.attendanceRecord.findMany({
          where: { date: { gte: todayStart, lte: todayEnd } },
        }),
        this.getOnMissionEmployeeIds(),
        this.getApprovedLeaveToday(),
        this.prisma.shiftRecord.count({ where: { endTime: null } }),
      ]);

    const leaveIds = new Set(onLeaveToday.map((l) => l.employeeId));
    const presentIds = new Set(todayRecords.filter((r) => r.checkIn).map((r) => r.employeeId));
    const late = todayRecords.filter((r) => r.status === 'LATE').length;
    const onDuty = employees.filter((e) =>
      ['ON_DUTY', 'AVAILABLE'].includes(e.shiftStatus),
    ).length;
    const offDuty = employees.filter((e) => e.shiftStatus === 'OFF_DUTY').length;
    const onLeave = employees.filter(
      (e) => leaveIds.has(e.id) || e.shiftStatus === 'ON_LEAVE',
    ).length;

    let absent = 0;
    employees.forEach((e) => {
      if (leaveIds.has(e.id) || onMissionIds.has(e.id) || presentIds.has(e.id)) return;
      if (e.shiftStatus === 'OFF_DUTY') return;
      absent++;
    });

    const total = employees.length || 1;
    const attendanceRate = Math.round((presentIds.size / total) * 1000) / 10;

    return {
      employeesPresentToday: presentIds.size,
      employeesAbsentToday: absent,
      lateArrivals: late,
      onLeave,
      onDuty,
      offDuty,
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
      attendanceStatus: mapRecordStatus(r.status),
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

    const [employees, records, onMissionIds, leaveOnDay] = await Promise.all([
      this.getActiveEmployees(),
      this.prisma.attendanceRecord.findMany({
        where: { date: { gte: dayStart, lte: dayEnd } },
        include: { employee: { include: this.employeeInclude } },
      }),
      isToday ? this.getOnMissionEmployeeIds() : Promise.resolve(new Set<string>()),
      this.getApprovedLeaveForRange(dayStart, dayEnd),
    ]);

    const recordByEmp = new Map(records.map((r) => [r.employeeId, r]));
    const leaveIds = new Set(leaveOnDay.map((l) => l.employeeId));

    const items = employees.map((e) => {
      const rec = recordByEmp.get(e.id);
      let status = 'Absent';
      if (leaveIds.has(e.id) || e.shiftStatus === 'ON_LEAVE') status = 'On Leave';
      else if (isToday && onMissionIds.has(e.id)) status = 'On Mission';
      else if (rec) status = mapRecordStatus(rec.status);
      else if (isToday && e.shiftStatus === 'OFF_DUTY') status = 'Off Duty';
      else if (isToday && e.shiftStatus === 'ON_BREAK') status = 'Break';
      else if (!rec) status = 'Absent';

      const present = ['Present', 'Late', 'On Mission'].includes(status);

      return {
        recordId: rec?.id ?? null,
        employeeDbId: e.id,
        employeeId: e.employeeCode ?? e.id,
        employeeName: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
        role: e.employeeRole?.name ?? '—',
        department: e.department?.name ?? '—',
        phone: e.phone ?? '—',
        shift: inferShiftLabel(e.typicalStartTime),
        status,
        present,
        absent: !present && status === 'Absent',
        clockIn: rec?.checkIn ?? null,
        clockOut: rec?.checkOut ?? null,
        totalHours: rec ? hoursBetween(rec.checkIn, rec.checkOut) : null,
        shiftStatus: e.shiftStatus,
        profilePhoto: e.profilePhoto,
      };
    });

    const presentCount = items.filter((i) => i.present).length;
    const absentCount = items.filter((i) => i.absent || i.status === 'Absent').length;
    const lateCount = items.filter((i) => i.status === 'Late').length;

    return {
      items,
      date: dayStart.toISOString().slice(0, 10),
      summary: {
        total: items.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        onLeave: items.filter((i) => i.status === 'On Leave').length,
        onMission: items.filter((i) => i.status === 'On Mission').length,
      },
    };
  }

  async getToday() {
    return this.getDayAttendance();
  }

  async getShiftManagement() {
    const employees = await this.getActiveEmployees();
    const openShifts = await this.prisma.shiftRecord.findMany({
      where: { endTime: null },
      include: { employee: { include: this.employeeInclude } },
    });

    const shifts = SHIFT_DEFINITIONS.map((s) => {
      const assigned = employees.filter(
        (e) => inferShiftLabel(e.typicalStartTime) === s.name,
      );
      return {
        ...s,
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
        shiftUtilization: SHIFT_DEFINITIONS.map((s) => ({
          name: s.name,
          value: Math.floor(Math.random() * 20) + 5,
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
