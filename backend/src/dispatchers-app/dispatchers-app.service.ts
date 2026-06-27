import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessControlService } from '../access-control/access-control.service';
import { EmergencyRequestStatus, NotificationCategory, NotificationType, Prisma } from '@prisma/client';
import {
  DispatcherScope,
  myCasesWhere,
  myActiveCasesWhere,
  regionalCasesWhere,
  regionalPendingCasesWhere,
  regionalEmployeeWhere,
  regionalAmbulanceWhere,
  regionalHospitalWhere,
} from './dispatcher-scope.util';

const ACTIVE_MISSION_STATUSES: EmergencyRequestStatus[] = [
  'REVIEWING',
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function minutesBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

@Injectable()
export class DispatchersAppService {
  constructor(
    private prisma: PrismaService,
    private accessControl: AccessControlService,
  ) {}

  private async getDispatcherByUserId(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId,
        employeeRole: { name: 'Dispatcher' },
      },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        station: { include: { region: true, district: true } },
        employeeRole: true,
        department: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Dispatcher profile not found');
    }

    if (employee.status !== 'ACTIVE') {
      throw new BadRequestException('Dispatcher account is inactive');
    }

    return employee;
  }

  private async resolveScope(userId: string): Promise<DispatcherScope> {
    const dispatcher = await this.getDispatcherByUserId(userId);
    return {
      dispatcherId: dispatcher.id,
      regionId: dispatcher.station?.regionId ?? null,
      districtId: dispatcher.station?.districtId ?? null,
      stationId: dispatcher.stationId ?? null,
      regionName: dispatcher.station?.region?.name ?? null,
    };
  }

  async getProfile(userId: string) {
    const employee = await this.getDispatcherByUserId(userId);
    const permData = await this.accessControl.getUserPermissions(userId);
    return {
      ...employee,
      permissions: permData.activePermissionKeys,
      activePermissionKeys: permData.activePermissionKeys,
      baselinePermissions: permData.baselinePermissions,
      activeGrantedKeys: permData.activeGrantedKeys ?? [],
      grantablePermissionKeys: permData.grantablePermissionKeys ?? [],
    };
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    const employee = await this.getDispatcherByUserId(userId);
    const { phone, alternatePhone, emergencyContactName, emergencyPhone } = data;

    return this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...(typeof phone === 'string' && { phone }),
        ...(typeof alternatePhone === 'string' && { alternatePhone }),
        ...(typeof emergencyContactName === 'string' && { emergencyContactName }),
        ...(typeof emergencyPhone === 'string' && { emergencyPhone }),
      },
      include: {
        user: { select: { id: true, username: true, email: true } },
        station: true,
        employeeRole: true,
        department: true,
      },
    });
  }

  async getDashboardStats(userId: string) {
    const scope = await this.resolveScope(userId);
    const caseBase = myCasesWhere(scope);
    const regionalEmp = regionalEmployeeWhere(scope);

    const [pending, active, myCases, ambulances, drivers, nurses] = await Promise.all([
      this.prisma.emergencyRequest.count({
        where: regionalPendingCasesWhere(scope),
      }),
      this.prisma.emergencyRequest.count({
        where: myCasesWhere(scope, {
          status: { notIn: ['COMPLETED', 'CANCELLED', 'PENDING'] },
        }),
      }),
      this.prisma.emergencyRequest.count({
        where: myCasesWhere(scope, { status: { notIn: ['COMPLETED', 'CANCELLED'] } }),
      }),
      this.prisma.ambulance.count({
        where: { ...regionalAmbulanceWhere(scope), status: 'AVAILABLE' },
      }),
      this.prisma.employee.count({
        where: {
          ...regionalEmp,
          employeeRole: { name: 'Driver' },
          shiftStatus: { in: ['AVAILABLE', 'ON_DUTY'] },
        },
      }),
      this.prisma.employee.count({
        where: {
          ...regionalEmp,
          employeeRole: { name: 'Nurse' },
          shiftStatus: { in: ['AVAILABLE', 'ON_DUTY'] },
        },
      }),
    ]);

    const dispatcher = await this.getDispatcherByUserId(userId);

    return {
      pending,
      active,
      myCases,
      availableAmbulances: ambulances,
      availableDrivers: drivers,
      availableNurses: nurses,
      shiftStatus: dispatcher.shiftStatus,
      station: dispatcher.station?.name ?? null,
      region: scope.regionName,
      scopedToRegion: Boolean(scope.regionId),
    };
  }

  async getDashboardOverview(userId: string) {
    const scope = await this.resolveScope(userId);
    const caseWhere = myCasesWhere(scope);

    const todayStart = startOfToday();
    const now = new Date();
    const pendingDelayCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const missionDelayCutoff = new Date(now.getTime() - 45 * 60 * 1000);

    const caseInclude = {
      patient: { select: { id: true, fullName: true, phone: true } },
      ambulance: { select: { id: true, ambulanceNumber: true, plateNumber: true, status: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      nurse: { select: { id: true, firstName: true, lastName: true } },
      destinationHospital: { select: { id: true, name: true } },
    };

    const [
      liveCasesCount,
      activeMissionsCount,
      pendingCount,
      criticalCount,
      delayedCount,
      liveCases,
      activeMissionsList,
      pendingQueue,
      criticalCasesList,
      completedToday,
      delayedMissionsList,
      ambulances,
      hospitals,
      statusLogs,
      activityLogs,
    ] = await Promise.all([
      this.prisma.emergencyRequest.count({
        where: { ...caseWhere, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.emergencyRequest.count({
        where: { ...caseWhere, status: { in: ACTIVE_MISSION_STATUSES } },
      }),
      this.prisma.emergencyRequest.count({ where: regionalPendingCasesWhere(scope) }),
      this.prisma.emergencyRequest.count({
        where: {
          ...caseWhere,
          priority: 'CRITICAL',
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      this.prisma.emergencyRequest.count({
        where: {
          ...caseWhere,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          OR: [
            { status: 'PENDING', createdAt: { lt: pendingDelayCutoff } },
            { status: { in: [...ACTIVE_MISSION_STATUSES] }, updatedAt: { lt: missionDelayCutoff } },
          ],
        },
      }),
      this.prisma.emergencyRequest.findMany({
        where: { ...caseWhere, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        include: caseInclude,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      this.prisma.emergencyRequest.findMany({
        where: { ...caseWhere, status: { in: ACTIVE_MISSION_STATUSES } },
        include: caseInclude,
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }),
      this.prisma.emergencyRequest.findMany({
        where: regionalPendingCasesWhere(scope),
        include: { patient: { select: { id: true, fullName: true } } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        take: 10,
      }),
      this.prisma.emergencyRequest.findMany({
        where: {
          ...caseWhere,
          priority: 'CRITICAL',
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: { patient: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.emergencyRequest.findMany({
        where: { ...caseWhere, status: 'COMPLETED', completedAt: { gte: todayStart } },
        select: {
          id: true,
          trackingCode: true,
          responseMinutes: true,
          createdAt: true,
          dispatchedAt: true,
          completedAt: true,
        },
      }),
      this.prisma.emergencyRequest.findMany({
        where: {
          ...caseWhere,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          OR: [
            { status: 'PENDING', createdAt: { lt: pendingDelayCutoff } },
            { status: { in: [...ACTIVE_MISSION_STATUSES] }, updatedAt: { lt: missionDelayCutoff } },
          ],
        },
        include: { patient: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      this.prisma.ambulance.findMany({
        where: regionalAmbulanceWhere(scope),
        select: { id: true, ambulanceNumber: true, plateNumber: true, status: true, location: true },
      }),
      this.prisma.hospital.findMany({
        where: regionalHospitalWhere(scope),
        select: {
          id: true,
          name: true,
          beds: true,
          erReady: true,
          status: true,
          color: true,
          district: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
        take: 12,
      }),
      this.prisma.emergencyStatusLog.findMany({
        where: { emergencyRequest: caseWhere },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          emergencyRequest: { select: { trackingCode: true, status: true } },
          changedByEmployee: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.activityLog.findMany({
        where: {
          entityType: 'EmergencyRequest',
          entityId: { in: await this.myCaseIds(scope) },
        },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              employee: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const availableAmbulances = ambulances.filter((a) => a.status === 'AVAILABLE').length;
    const busyAmbulances = ambulances.filter((a) => a.status === 'ON_DUTY').length;
    const offlineAmbulances = ambulances.filter(
      (a) => a.status === 'MAINTENANCE' || a.status === 'UNAVAILABLE',
    ).length;

    const responseSamples = completedToday
      .map((r) => {
        if (r.responseMinutes != null) return r.responseMinutes;
        if (r.dispatchedAt && r.createdAt) {
          return minutesBetween(new Date(r.createdAt), new Date(r.dispatchedAt));
        }
        return null;
      })
      .filter((v): v is number => v != null && v >= 0);

    const averageResponseTimeMinutes =
      responseSamples.length > 0
        ? Math.round(
            responseSamples.reduce((sum, v) => sum + v, 0) / responseSamples.length,
          )
        : null;

    const activityFeed = [
      ...statusLogs.map((log) => ({
        id: `status-${log.id}`,
        type: 'status_change' as const,
        title: log.emergencyRequest.trackingCode,
        message: `${log.fromStatus ?? 'NEW'} → ${log.toStatus}`,
        actor:
          log.changedByEmployee
            ? `${log.changedByEmployee.firstName} ${log.changedByEmployee.lastName}`.trim()
            : 'System',
        severity: log.toStatus === 'COMPLETED' ? 'success' : 'info',
        createdAt: log.createdAt.toISOString(),
      })),
      ...activityLogs.map((log) => ({
        id: `activity-${log.id}`,
        type: 'activity' as const,
        title: log.action,
        message: log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}` : 'System event',
        actor:
          log.user?.employee
            ? `${log.user.employee.firstName} ${log.user.employee.lastName}`.trim()
            : log.user?.username ?? 'System',
        severity: 'info' as const,
        createdAt: log.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 25);

    const stats = await this.getDashboardStats(userId);
    const staff = await this.getStaffOverview(userId);

    return {
      scope: {
        region: scope.regionName,
        station: stats.station,
        myCasesOnly: true,
      },
      kpis: {
        liveEmergencyCases: liveCasesCount,
        activeMissions: activeMissionsCount,
        availableAmbulances,
        busyAmbulances,
        offlineAmbulances,
        pendingDispatches: pendingCount,
        criticalCases: criticalCount,
        averageResponseTimeMinutes,
        todayCompletedMissions: completedToday.length,
        delayedMissions: delayedCount,
      },
      liveCases,
      activeMissions: activeMissionsList,
      pendingQueue,
      criticalCases: criticalCasesList,
      delayedMissions: delayedMissionsList,
      hospitalCapacity: hospitals.map((h) => ({
        id: h.id,
        name: h.name,
        beds: h.beds,
        erReady: h.erReady,
        status: h.status,
        color: h.color,
        district: h.district?.name ?? null,
      })),
      activityFeed,
      crewStatus: {
        driversAvailable: staff.drivers.filter((d) =>
          ['AVAILABLE', 'ON_DUTY'].includes(d.shiftStatus),
        ).length,
        driversTotal: staff.drivers.length,
        nursesAvailable: staff.nurses.filter((n) =>
          ['AVAILABLE', 'ON_DUTY'].includes(n.shiftStatus),
        ).length,
        nursesTotal: staff.nurses.length,
        dispatchersOnDuty: staff.dispatchers.filter((d) => d.shiftStatus === 'ON_DUTY').length,
      },
      shiftStatus: stats.shiftStatus,
      station: stats.station,
      updatedAt: now.toISOString(),
    };
  }

  async getShiftStatus(userId: string) {
    const employee = await this.getDispatcherByUserId(userId);
    const activeShift = await this.prisma.shiftRecord.findFirst({
      where: { employeeId: employee.id, status: 'ON_DUTY', endTime: null },
      orderBy: { createdAt: 'desc' },
    });

    return {
      shiftStatus: employee.shiftStatus,
      employeeId: employee.id,
      activeShift,
    };
  }

  async startShift(userId: string) {
    const employee = await this.getDispatcherByUserId(userId);

    await this.prisma.shiftRecord.updateMany({
      where: { employeeId: employee.id, status: 'ON_DUTY', endTime: null },
      data: { endTime: new Date(), status: 'COMPLETED' },
    });

    const shift = await this.prisma.shiftRecord.create({
      data: {
        employeeId: employee.id,
        status: 'ON_DUTY',
        startTime: new Date(),
      },
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { shiftStatus: 'ON_DUTY' },
    });

    return { message: 'Shift started', shift };
  }

  async endShift(userId: string) {
    const employee = await this.getDispatcherByUserId(userId);

    await this.prisma.shiftRecord.updateMany({
      where: { employeeId: employee.id, status: 'ON_DUTY', endTime: null },
      data: { endTime: new Date(), status: 'COMPLETED' },
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { shiftStatus: 'OFF_DUTY' },
    });

    return { message: 'Shift ended' };
  }

  async toggleAvailability(userId: string, available: boolean) {
    const employee = await this.getDispatcherByUserId(userId);
    const shiftStatus = available ? 'AVAILABLE' : 'OFF_DUTY';

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { shiftStatus },
    });

    return { shiftStatus };
  }

  private async myCaseIds(scope: DispatcherScope): Promise<string[]> {
    const rows = await this.prisma.emergencyRequest.findMany({
      where: myCasesWhere(scope),
      select: { id: true },
      take: 500,
    });
    return rows.map((r) => r.id);
  }

  async getMyCases(userId: string, status?: string) {
    const scope = await this.resolveScope(userId);

    const where: Prisma.EmergencyRequestWhereInput = myCasesWhere(scope);
    if (status) {
      where.status = status as EmergencyRequestStatus;
    }

    return this.prisma.emergencyRequest.findMany({
      where,
      include: {
        patient: true,
        ambulance: true,
        driver: true,
        nurse: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getPendingQueue(userId: string) {
    const scope = await this.resolveScope(userId);
    return this.prisma.emergencyRequest.findMany({
      where: regionalPendingCasesWhere(scope),
      include: { patient: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getActiveMissions(userId: string) {
    const scope = await this.resolveScope(userId);
    return this.prisma.emergencyRequest.findMany({
      where: myActiveCasesWhere(scope),
      include: {
        patient: true,
        ambulance: true,
        driver: true,
        nurse: true,
        dispatcher: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getFleetOverview(userId: string) {
    const scope = await this.resolveScope(userId);
    return this.prisma.ambulance.findMany({
      where: regionalAmbulanceWhere(scope),
      include: {
        station: true,
        equipmentLevel: true,
        region: true,
        employees: {
          where: { employeeRole: { name: 'Driver' } },
          take: 1,
        },
      },
      orderBy: { status: 'asc' },
    });
  }

  async getStaffOverview(userId: string) {
    const scope = await this.resolveScope(userId);
    const regional = regionalEmployeeWhere(scope);

    const [drivers, nurses, dispatchers] = await Promise.all([
      this.prisma.employee.findMany({
        where: { ...regional, employeeRole: { name: 'Driver' } },
        include: { station: true, assignedAmbulance: true, employeeRole: true },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: { ...regional, employeeRole: { name: 'Nurse' } },
        include: { station: true, employeeRole: true },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: {
          employeeRole: { name: 'Dispatcher' },
          status: 'ACTIVE',
          ...(scope.regionId ? { station: { regionId: scope.regionId } } : { id: scope.dispatcherId }),
        },
        include: { station: true, employeeRole: true },
        orderBy: { firstName: 'asc' },
      }),
    ]);

    return { drivers, nurses, dispatchers, region: scope.regionName };
  }

  async getEmergenciesByView(userId: string, view: string) {
    const scope = await this.resolveScope(userId);
    const include = {
      patient: { select: { id: true, fullName: true, phone: true } },
      ambulance: { select: { id: true, ambulanceNumber: true, plateNumber: true, status: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      nurse: { select: { id: true, firstName: true, lastName: true } },
      destinationHospital: { select: { id: true, name: true } },
    };

    const now = new Date();
    const delayedCutoff = new Date(now.getTime() - 30 * 60 * 1000);

    const filters: Record<string, object> = {
      'all-cases': {},
      'pending-dispatch': { status: 'PENDING' },
      'dispatch-board': { status: { in: ['PENDING', 'REVIEWING', 'ASSIGNED'] } },
      'active-missions': { status: { in: ACTIVE_MISSION_STATUSES } },
      'en-route': { status: { in: ['EN_ROUTE', 'DISPATCHED'] } },
      'at-patient': { status: { in: ['ARRIVED_SCENE', 'PATIENT_STABILIZED'] } },
      transporting: { status: 'TRANSPORTING' },
      'arrived-hospital': { status: 'ARRIVED_HOSPITAL' },
      handover: { status: 'ARRIVED_HOSPITAL' },
      critical: { priority: 'CRITICAL', status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      escalated: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        OR: [
          { status: 'PENDING', createdAt: { lt: delayedCutoff } },
          { priority: { in: ['CRITICAL', 'HIGH'] }, status: 'PENDING' },
        ],
      },
      cancelled: { status: 'CANCELLED' },
      closed: { status: 'COMPLETED' },
      incoming: { status: { in: ['TRANSPORTING', 'ARRIVED_HOSPITAL'] } },
      decisions: { status: { in: ['CANCELLED', 'COMPLETED'] } },
      directory: {},
    };

    const pendingViews = new Set([
      'pending-dispatch',
      'dispatch-board',
      'triage',
      'directory',
    ]);
    const myCaseViews = new Set([
      'active-missions',
      'en-route',
      'at-patient',
      'transporting',
      'arrived-hospital',
      'handover',
      'incoming',
      'timeline',
      'closed',
      'cancelled',
      'decisions',
    ]);

    const scopeWhere = pendingViews.has(view)
      ? regionalPendingCasesWhere(scope, filters[view] ?? {})
      : myCaseViews.has(view)
        ? myCasesWhere(scope, filters[view] ?? {})
        : view === 'critical' || view === 'escalated'
          ? {
              OR: [
                regionalPendingCasesWhere(scope, filters[view] ?? {}),
                myCasesWhere(scope, filters[view] ?? {}),
              ],
            }
          : view === 'all-cases'
            ? regionalPendingCasesWhere(scope)
            : { ...regionalCasesWhere(scope), ...(filters[view] ?? filters['all-cases']) };

    const where = scopeWhere;

    const [items, statusLogs] = await Promise.all([
      this.prisma.emergencyRequest.findMany({
        where,
        include,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 100,
      }),
      view === 'timeline'
        ? this.prisma.emergencyStatusLog.findMany({
            where: { emergencyRequest: myCasesWhere(scope) },
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
              emergencyRequest: { select: { trackingCode: true, status: true } },
              changedByEmployee: { select: { firstName: true, lastName: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    return { view, items, statusLogs, total: items.length, region: scope.regionName };
  }

  async getAmbulancesByView(userId: string, view: string) {
    const all = await this.getFleetOverview(userId);
    let items = all;

    switch (view) {
      case 'available':
        items = all.filter((a) => a.status === 'AVAILABLE');
        break;
      case 'busy':
        items = all.filter((a) => a.status === 'ON_DUTY');
        break;
      case 'out-of-service':
        items = all.filter((a) => a.status === 'UNAVAILABLE' || !a.isActive);
        break;
      case 'maintenance':
        items = all.filter((a) => a.status === 'MAINTENANCE');
        break;
      case 'fuel':
        items = all.filter((a) => (a.fuelLevel ?? 100) < 30);
        break;
      case 'equipment':
        items = all.filter((a) => !a.oxygenAvailable || !a.defibrillatorAvailable);
        break;
      default:
        break;
    }

    return { view, items, total: items.length, region: (await this.resolveScope(userId)).regionName };
  }

  async getCrewByView(userId: string, view: string) {
    const scope = await this.resolveScope(userId);
    const staff = await this.getStaffOverview(userId);
    const onMissionIds = new Set<string>();

    const active = await this.prisma.emergencyRequest.findMany({
      where: regionalCasesWhere(scope, { status: { in: ACTIVE_MISSION_STATUSES } }),
      select: { driverId: true, nurseId: true },
    });
    active.forEach((m) => {
      if (m.driverId) onMissionIds.add(m.driverId);
      if (m.nurseId) onMissionIds.add(m.nurseId);
    });

    const filterEmployees = (list: typeof staff.drivers) => {
      switch (view) {
        case 'drivers':
          return staff.drivers;
        case 'nurses':
          return staff.nurses;
        case 'paramedics':
          return staff.nurses;
        case 'drivers-available':
          return staff.drivers.filter(
            (e) => ['AVAILABLE', 'ON_DUTY'].includes(e.shiftStatus) && !onMissionIds.has(e.id),
          );
        case 'nurses-available':
          return staff.nurses.filter(
            (e) => ['AVAILABLE', 'ON_DUTY'].includes(e.shiftStatus) && !onMissionIds.has(e.id),
          );
        case 'available':
          return [...staff.drivers, ...staff.nurses].filter(
            (e) => ['AVAILABLE', 'ON_DUTY'].includes(e.shiftStatus) && !onMissionIds.has(e.id),
          );
        case 'on-mission':
          return [...staff.drivers, ...staff.nurses].filter((e) => onMissionIds.has(e.id));
        case 'off-duty':
          return [...staff.drivers, ...staff.nurses].filter((e) => e.shiftStatus === 'OFF_DUTY');
        default:
          return [...staff.drivers, ...staff.nurses, ...staff.dispatchers];
      }
    };

    const items = filterEmployees(staff.drivers);
    return { view, items, staff, onMissionCount: onMissionIds.size, region: scope.regionName };
  }

  async getHospitalsByView(userId: string, view: string) {
    const scope = await this.resolveScope(userId);
    const hospitals = await this.prisma.hospital.findMany({
      where: regionalHospitalWhere(scope),
      include: { district: { select: { name: true } }, region: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    let items = hospitals;
    if (view === 'directory' || view === 'hospitals') {
      items = hospitals;
    } else if (view === 'receiving') {
      items = hospitals.filter((h) => h.erReady || h.acceptEmergencyCases);
    } else if (view === 'capacity' || view === 'availability' || view === 'beds') {
      items = hospitals.filter((h) => h.beds > 0);
    } else if (view === 'icu') {
      items = hospitals.filter((h) => (h.icuTotalBeds ?? 0) > 0);
    }

    return { view, items, total: items.length, region: scope.regionName };
  }

  async getAlertsByView(userId: string, view: string) {
    const scope = await this.resolveScope(userId);
    const regional = regionalCasesWhere(scope);
    const now = new Date();
    const pendingDelay = new Date(now.getTime() - 30 * 60 * 1000);

    const [critical, delayed, unassigned, maintenanceAmbulances, hospitalsFull] =
      await Promise.all([
        this.prisma.emergencyRequest.findMany({
          where: {
            ...regional,
            priority: 'CRITICAL',
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
          include: { patient: { select: { fullName: true } } },
          take: 20,
        }),
        this.prisma.emergencyRequest.findMany({
          where: {
            ...regional,
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
            OR: [
              { status: 'PENDING', createdAt: { lt: pendingDelay } },
              { status: { in: ACTIVE_MISSION_STATUSES }, updatedAt: { lt: pendingDelay } },
            ],
          },
          take: 20,
        }),
        this.prisma.emergencyRequest.findMany({
          where: { ...regional, status: 'PENDING' },
          take: 20,
        }),
        this.prisma.ambulance.findMany({
          where: { ...regionalAmbulanceWhere(scope), status: 'MAINTENANCE' },
          take: 20,
        }),
        this.prisma.hospital.findMany({
          where: {
            ...regionalHospitalWhere(scope),
            status: { in: ['Full', 'Overcapacity'] },
          },
          take: 20,
        }),
      ]);

    const alertMap: Record<string, unknown[]> = {
      all: [
        ...critical,
        ...delayed,
        ...unassigned,
        ...maintenanceAmbulances,
        ...hospitalsFull,
      ],
      critical,
      emergency: critical,
      delays: delayed,
      unassigned,
      resource: [...unassigned, ...maintenanceAmbulances],
      breakdowns: maintenanceAmbulances,
      'crew-shortage': [],
      'comm-failures': [],
      overcapacity: hospitalsFull,
      hospital: hospitalsFull,
      maintenance: maintenanceAmbulances,
      system: [],
    };

    return {
      view,
      items: alertMap[view] ?? critical,
      counts: {
        critical: critical.length,
        delays: delayed.length,
        unassigned: unassigned.length,
        maintenance: maintenanceAmbulances.length,
        overcapacity: hospitalsFull.length,
      },
      region: scope.regionName,
    };
  }

  async getReports(userId: string, reportType = 'emergency') {
    const scope = await this.resolveScope(userId);
    const caseWhere = myCasesWhere(scope);
    const todayStart = startOfToday();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [cases, completedToday, completedMonth, attendance, statusBreakdown] =
      await Promise.all([
        this.prisma.emergencyRequest.findMany({
          where: caseWhere,
          include: {
            patient: { select: { fullName: true, phone: true } },
            driver: { select: { firstName: true, lastName: true, employeeCode: true } },
            nurse: { select: { firstName: true, lastName: true, employeeCode: true } },
            ambulance: { select: { ambulanceNumber: true, plateNumber: true } },
            destinationHospital: { select: { name: true } },
            region: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
        this.prisma.emergencyRequest.count({
          where: { ...caseWhere, status: 'COMPLETED', completedAt: { gte: todayStart } },
        }),
        this.prisma.emergencyRequest.count({
          where: { ...caseWhere, status: 'COMPLETED', completedAt: { gte: monthStart } },
        }),
        this.prisma.attendanceRecord.findMany({
          where: {
            employee: regionalEmployeeWhere(scope),
            date: { gte: monthStart },
          },
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeCode: true,
                employeeRole: { select: { name: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 200,
        }),
        this.prisma.emergencyRequest.groupBy({
          by: ['status'],
          where: caseWhere,
          _count: { id: true },
        }),
      ]);

    const responseTimes = cases
      .filter((c) => c.responseMinutes != null)
      .map((c) => c.responseMinutes as number);
    const avgResponse =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

    return {
      reportType,
      region: scope.regionName,
      scope: 'my_cases',
      summary: {
        totalCases: cases.length,
        completedToday,
        completedMonth,
        avgResponseMinutes: avgResponse,
        criticalOpen: cases.filter(
          (c) => c.priority === 'CRITICAL' && !['COMPLETED', 'CANCELLED'].includes(c.status),
        ).length,
        activeCases: cases.filter(
          (c) => !['COMPLETED', 'CANCELLED', 'PENDING'].includes(c.status),
        ).length,
      },
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      cases,
      attendance,
    };
  }

  async getAssignableResources(userId: string) {
    const scope = await this.resolveScope(userId);

    const busy = await this.prisma.emergencyRequest.findMany({
      where: regionalCasesWhere(scope, { status: { in: ACTIVE_MISSION_STATUSES } }),
      select: { driverId: true, nurseId: true, ambulanceId: true },
    });
    const busyDriverIds = busy.map((b) => b.driverId).filter(Boolean) as string[];
    const busyNurseIds = busy.map((b) => b.nurseId).filter(Boolean) as string[];
    const busyAmbulanceIds = busy.map((b) => b.ambulanceId).filter(Boolean) as string[];

    const driverRole = await this.prisma.employeeRole.findFirst({
      where: { name: { contains: 'Driver', mode: 'insensitive' } },
    });
    const nurseRole = await this.prisma.employeeRole.findFirst({
      where: { name: { contains: 'Nurse', mode: 'insensitive' } },
    });

    const [ambulances, drivers, nurses] = await Promise.all([
      this.prisma.ambulance.findMany({
        where: {
          ...regionalAmbulanceWhere(scope),
          status: 'AVAILABLE',
          id: { notIn: busyAmbulanceIds },
        },
      }),
      driverRole
        ? this.prisma.employee.findMany({
            where: {
              ...regionalEmployeeWhere(scope),
              employeeRoleId: driverRole.id,
              status: 'ACTIVE',
              shiftStatus: 'AVAILABLE',
              assignedAmbulanceId: { not: null },
              id: { notIn: busyDriverIds },
            },
            include: { assignedAmbulance: true },
          })
        : [],
      nurseRole
        ? this.prisma.employee.findMany({
            where: {
              ...regionalEmployeeWhere(scope),
              employeeRoleId: nurseRole.id,
              status: 'ACTIVE',
              shiftStatus: 'AVAILABLE',
              id: { notIn: busyNurseIds },
            },
          })
        : [],
    ]);

    return { ambulances, drivers, nurses, region: scope.regionName };
  }

  async getCaseNotifications(userId: string, view = 'all') {
    const scope = await this.resolveScope(userId);

    const caseInclude = {
      patient: { select: { id: true, fullName: true, phone: true } },
      ambulance: {
        select: { id: true, ambulanceNumber: true, plateNumber: true, status: true },
      },
      driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
      nurse: { select: { id: true, firstName: true, lastName: true, phone: true } },
      region: { select: { id: true, name: true } },
      destinationHospital: { select: { id: true, name: true } },
    };

    const [notifications, regionalCases] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      view === 'emergency' || view === 'all'
        ? this.prisma.emergencyRequest.findMany({
            where: {
              OR: [
                regionalPendingCasesWhere(scope),
                myCasesWhere(scope, {
                  status: { notIn: ['COMPLETED', 'CANCELLED'] },
                }),
              ],
            },
            include: caseInclude,
            orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
            take: 50,
          })
        : Promise.resolve([]),
    ]);

    let filtered = notifications;
    if (view === 'emergency') {
      filtered = notifications.filter(
        (n) =>
          n.type === NotificationType.EMERGENCY ||
          n.category === NotificationCategory.MISSION ||
          n.category === NotificationCategory.INCIDENT ||
          n.priority === 'CRITICAL',
      );
    } else if (view === 'hospital') {
      filtered = notifications.filter((n) =>
        /hospital|handover|accept/i.test(`${n.title} ${n.message}`),
      );
    } else if (view === 'resource') {
      filtered = notifications.filter((n) =>
        /driver|nurse|ambulance|crew|transport|en route|dispatched/i.test(
          `${n.title} ${n.message}`,
        ),
      );
    }

    const caseMap = new Map(regionalCases.map((c) => [c.id, c]));
    const missingCaseIds = [
      ...new Set(
        filtered
          .filter((n) => n.entityType === 'EmergencyRequest' && n.entityId)
          .map((n) => n.entityId as string)
          .filter((id) => !caseMap.has(id)),
      ),
    ];

    if (missingCaseIds.length) {
      const extraCases = await this.prisma.emergencyRequest.findMany({
        where: {
          id: { in: missingCaseIds },
          ...(scope.regionId
            ? { regionId: scope.regionId }
            : { dispatcherId: scope.dispatcherId }),
        },
        include: caseInclude,
      });
      for (const c of extraCases) {
        caseMap.set(c.id, c);
      }
    }

    const items = filtered.map((n) => ({
      ...n,
      emergencyCase:
        n.entityType === 'EmergencyRequest' && n.entityId
          ? caseMap.get(n.entityId) ?? null
          : null,
    }));

    return {
      view,
      items,
      cases: regionalCases,
      total: items.length,
      unread: items.filter((n) => n.status === 'UNREAD').length,
      region: scope.regionName,
    };
  }
}
