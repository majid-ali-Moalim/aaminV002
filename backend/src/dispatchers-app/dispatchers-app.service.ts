import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmergencyRequestStatus } from '@prisma/client';

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
  constructor(private prisma: PrismaService) {}

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

  async getProfile(userId: string) {
    return this.getDispatcherByUserId(userId);
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
    const dispatcher = await this.getDispatcherByUserId(userId);

    const [pending, active, myCases, ambulances, drivers, nurses] = await Promise.all([
      this.prisma.emergencyRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.emergencyRequest.count({
        where: {
          status: {
            notIn: ['COMPLETED', 'CANCELLED', 'PENDING'],
          },
        },
      }),
      this.prisma.emergencyRequest.count({
        where: {
          dispatcherId: dispatcher.id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      this.prisma.ambulance.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.employee.count({
        where: {
          employeeRole: { name: 'Driver' },
          status: 'ACTIVE',
          shiftStatus: { in: ['AVAILABLE', 'ON_DUTY'] },
        },
      }),
      this.prisma.employee.count({
        where: {
          employeeRole: { name: 'Nurse' },
          status: 'ACTIVE',
          shiftStatus: { in: ['AVAILABLE', 'ON_DUTY'] },
        },
      }),
    ]);

    return {
      pending,
      active,
      myCases,
      availableAmbulances: ambulances,
      availableDrivers: drivers,
      availableNurses: nurses,
      shiftStatus: dispatcher.shiftStatus,
      station: dispatcher.station?.name ?? null,
    };
  }

  async getDashboardOverview(userId: string) {
    await this.getDispatcherByUserId(userId);

    const todayStart = startOfToday();
    const now = new Date();
    const pendingDelayCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const missionDelayCutoff = new Date(now.getTime() - 45 * 60 * 1000);

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
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.emergencyRequest.count({
        where: { status: { in: ACTIVE_MISSION_STATUSES } },
      }),
      this.prisma.emergencyRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.emergencyRequest.count({
        where: { priority: 'CRITICAL', status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.emergencyRequest.count({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          OR: [
            { status: 'PENDING', createdAt: { lt: pendingDelayCutoff } },
            {
              status: { in: [...ACTIVE_MISSION_STATUSES] },
              updatedAt: { lt: missionDelayCutoff },
            },
          ],
        },
      }),
      this.prisma.emergencyRequest.findMany({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        include: {
          patient: { select: { id: true, fullName: true, phone: true } },
          ambulance: { select: { id: true, ambulanceNumber: true, plateNumber: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      this.prisma.emergencyRequest.findMany({
        where: { status: { in: ACTIVE_MISSION_STATUSES } },
        include: {
          patient: { select: { id: true, fullName: true } },
          ambulance: { select: { id: true, ambulanceNumber: true, status: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
          destinationHospital: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }),
      this.prisma.emergencyRequest.findMany({
        where: { status: 'PENDING' },
        include: { patient: { select: { id: true, fullName: true } } },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        take: 10,
      }),
      this.prisma.emergencyRequest.findMany({
        where: {
          priority: 'CRITICAL',
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: { patient: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.emergencyRequest.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: { gte: todayStart },
        },
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
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          OR: [
            { status: 'PENDING', createdAt: { lt: pendingDelayCutoff } },
            {
              status: { in: [...ACTIVE_MISSION_STATUSES] },
              updatedAt: { lt: missionDelayCutoff },
            },
          ],
        },
        include: { patient: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      this.prisma.ambulance.findMany({
        where: { isActive: true },
        select: { id: true, ambulanceNumber: true, plateNumber: true, status: true, location: true },
      }),
      this.prisma.hospital.findMany({
        where: { isActive: true },
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
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          emergencyRequest: { select: { trackingCode: true, status: true } },
          changedByEmployee: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.activityLog.findMany({
        where: {
          OR: [
            { entityType: 'EmergencyRequest' },
            { entityType: 'Ambulance' },
            { entityType: 'Employee' },
            { action: { contains: 'dispatch', mode: 'insensitive' } },
          ],
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
    const staff = await this.getStaffOverview();

    return {
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

  async getMyCases(userId: string, status?: string) {
    const dispatcher = await this.getDispatcherByUserId(userId);

    const where: Record<string, unknown> = { dispatcherId: dispatcher.id };
    if (status) {
      where.status = status;
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

  async getPendingQueue() {
    return this.prisma.emergencyRequest.findMany({
      where: { status: 'PENDING' },
      include: { patient: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getActiveMissions() {
    return this.prisma.emergencyRequest.findMany({
      where: {
        status: {
          notIn: ['COMPLETED', 'CANCELLED', 'PENDING'],
        },
      },
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

  async getFleetOverview() {
    return this.prisma.ambulance.findMany({
      include: {
        station: true,
        equipmentLevel: true,
        employees: {
          where: { employeeRole: { name: 'Driver' } },
          take: 1,
        },
      },
      orderBy: { status: 'asc' },
    });
  }

  async getStaffOverview() {
    const [drivers, nurses, dispatchers] = await Promise.all([
      this.prisma.employee.findMany({
        where: { employeeRole: { name: 'Driver' }, status: 'ACTIVE' },
        include: { station: true, assignedAmbulance: true },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: { employeeRole: { name: 'Nurse' }, status: 'ACTIVE' },
        include: { station: true },
        orderBy: { firstName: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: { employeeRole: { name: 'Dispatcher' }, status: 'ACTIVE' },
        include: { station: true },
        orderBy: { firstName: 'asc' },
      }),
    ]);

    return { drivers, nurses, dispatchers };
  }

  async getEmergenciesByView(view: string) {
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
    };

    const where = filters[view] ?? filters['all-cases'];

    const [items, statusLogs] = await Promise.all([
      this.prisma.emergencyRequest.findMany({
        where,
        include,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 100,
      }),
      view === 'timeline'
        ? this.prisma.emergencyStatusLog.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
              emergencyRequest: { select: { trackingCode: true, status: true } },
              changedByEmployee: { select: { firstName: true, lastName: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    return { view, items, statusLogs, total: items.length };
  }

  async getAmbulancesByView(view: string) {
    const all = await this.getFleetOverview();
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

    return { view, items, total: items.length };
  }

  async getCrewByView(view: string) {
    const staff = await this.getStaffOverview();
    const onMissionIds = new Set<string>();

    const active = await this.prisma.emergencyRequest.findMany({
      where: { status: { in: ACTIVE_MISSION_STATUSES } },
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
    return { view, items, staff, onMissionCount: onMissionIds.size };
  }

  async getHospitalsByView(view: string) {
    const hospitals = await this.prisma.hospital.findMany({
      where: { isActive: true },
      include: { district: { select: { name: true } }, region: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    let items = hospitals;
    if (view === 'receiving') items = hospitals.filter((h) => h.erReady);
    if (view === 'capacity' || view === 'beds')
      items = hospitals.filter((h) => h.beds > 0);
    if (view === 'icu') items = hospitals.filter((h) => h.status !== 'Full');

    return { view, items, total: items.length };
  }

  async getAlertsByView(view: string) {
    const now = new Date();
    const pendingDelay = new Date(now.getTime() - 30 * 60 * 1000);

    const [critical, delayed, unassigned, maintenanceAmbulances, hospitalsFull] =
      await Promise.all([
        this.prisma.emergencyRequest.findMany({
          where: { priority: 'CRITICAL', status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: { patient: { select: { fullName: true } } },
          take: 20,
        }),
        this.prisma.emergencyRequest.findMany({
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
            OR: [
              { status: 'PENDING', createdAt: { lt: pendingDelay } },
              { status: { in: ACTIVE_MISSION_STATUSES }, updatedAt: { lt: pendingDelay } },
            ],
          },
          take: 20,
        }),
        this.prisma.emergencyRequest.findMany({
          where: { status: 'PENDING' },
          take: 20,
        }),
        this.prisma.ambulance.findMany({
          where: { status: 'MAINTENANCE' },
          take: 20,
        }),
        this.prisma.hospital.findMany({
          where: { status: { in: ['Full', 'Overcapacity'] } },
          take: 20,
        }),
      ]);

    const alertMap: Record<string, unknown[]> = {
      critical,
      delays: delayed,
      unassigned,
      breakdowns: maintenanceAmbulances,
      'crew-shortage': [],
      'comm-failures': [],
      overcapacity: hospitalsFull,
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
    };
  }
}
