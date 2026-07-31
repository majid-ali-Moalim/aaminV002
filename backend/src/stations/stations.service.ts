import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StationCoverageService } from '../station-coverage/station-coverage.service';

const ACTIVE_CASE_STATUSES = [
  'REVIEWING', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE',
  'PATIENT_STABILIZED', 'TRANSPORTING', 'ARRIVED_HOSPITAL',
] as const;

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'] as const;

function parseCoverageIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  return [];
}

@Injectable()
export class StationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stationCoverage: StationCoverageService,
  ) {}

  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const openFilter = { status: { notIn: [...TERMINAL_STATUSES] } };

    const [
      totalStations,
      activeStations,
      ambulances,
      drivers,
      nurses,
      dispatchers,
      pendingCases,
      activeCases,
      casesToday,
      transfersToday,
      stations,
    ] = await Promise.all([
      this.prisma.station.count(),
      this.prisma.station.count({ where: { isActive: true } }),
      this.prisma.ambulance.findMany({
        where: { isActive: true },
        select: { id: true, status: true, stationId: true },
      }),
      this.prisma.employee.count({
        where: { status: 'ACTIVE', employeeRole: { name: { equals: 'Driver', mode: 'insensitive' } } },
      }),
      this.prisma.employee.count({
        where: { status: 'ACTIVE', employeeRole: { name: { equals: 'Nurse', mode: 'insensitive' } } },
      }),
      this.prisma.employee.count({
        where: { status: 'ACTIVE', employeeRole: { name: { equals: 'Dispatcher', mode: 'insensitive' } } },
      }),
      this.prisma.emergencyRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.emergencyRequest.count({ where: { status: { in: [...ACTIVE_CASE_STATUSES] } } }),
      this.prisma.emergencyRequest.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.emergencyCaseTransfer.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.station.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              emergencyRequests: { where: openFilter },
            },
          },
        },
      }),
    ]);

    const busyAmbIds = await this.prisma.emergencyRequest.findMany({
      where: { status: { in: [...ACTIVE_CASE_STATUSES] }, ambulanceId: { not: null } },
      select: { ambulanceId: true },
    });
    const busySet = new Set(busyAmbIds.map((r) => r.ambulanceId!));

    const availableAmbulances = ambulances.filter(
      (a) => a.status === 'AVAILABLE' && !busySet.has(a.id),
    ).length;
    const busyAmbulances = ambulances.filter(
      (a) => a.status === 'ON_DUTY' || busySet.has(a.id),
    ).length;

    const stationWorkload = stations
      .map((s) => ({ id: s.id, name: s.name, activeCases: s._count.emergencyRequests }))
      .sort((a, b) => b.activeCases - a.activeCases)
      .slice(0, 8);

    const monthStart = new Date(todayStart);
    monthStart.setDate(1);
    const monthlyCases = await this.prisma.emergencyRequest.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: monthStart } },
      _count: true,
    });

    const casesByDay: Record<string, number> = {};
    for (const row of monthlyCases) {
      const key = row.createdAt.toISOString().slice(0, 10);
      casesByDay[key] = (casesByDay[key] ?? 0) + row._count;
    }

    const utilizationPct = ambulances.length
      ? Math.round((busyAmbulances / ambulances.length) * 100)
      : 0;

    return {
      cards: {
        totalStations,
        activeStations,
        totalAmbulances: ambulances.length,
        availableAmbulances,
        busyAmbulances,
        dispatchers,
        drivers,
        nurses,
        activeCases,
        pendingCases,
      },
      charts: {
        casesToday,
        transfersToday,
        ambulanceUtilization: utilizationPct,
        stationWorkload,
        monthlyCases: Object.entries(casesByDay).map(([date, count]) => ({ date, count })),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async findAll() {
    const stations = await this.prisma.station.findMany({
      include: {
        region: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
        _count: {
          select: {
            ambulances: { where: { isActive: true } },
            employees: true,
            emergencyRequests: {
              where: { status: { in: [...ACTIVE_CASE_STATUSES] } },
            },
          },
        },
        employees: {
          where: { employeeRole: { name: { equals: 'Dispatcher', mode: 'insensitive' } } },
          take: 1,
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const allDistricts = await this.prisma.district.findMany({
      select: { id: true, name: true },
    });
    const districtMap = new Map(allDistricts.map((d) => [d.id, d.name]));

    const roleCounts = await this.prisma.employee.groupBy({
      by: ['stationId', 'employeeRoleId'],
      where: { stationId: { not: null }, status: 'ACTIVE' },
      _count: true,
    });

    const roles = await this.prisma.employeeRole.findMany({
      select: { id: true, name: true },
    });
    const roleName = new Map(roles.map((r) => [r.id, r.name.toLowerCase()]));

    return stations.map((station) => {
      const coverageIds = parseCoverageIds(station.coverageDistrictIds);
      const counts = { drivers: 0, nurses: 0, dispatchers: 0 };
      for (const rc of roleCounts.filter((r) => r.stationId === station.id)) {
        const name = roleName.get(rc.employeeRoleId) ?? '';
        if (name.includes('driver')) counts.drivers += rc._count;
        else if (name.includes('nurse')) counts.nurses += rc._count;
        else if (name.includes('dispatcher')) counts.dispatchers += rc._count;
      }

      const manager = station.employees[0];
      return {
        id: station.id,
        name: station.name,
        code: station.code,
        region: station.region,
        homeDistrict: station.district,
        coverageDistricts: coverageIds.map((id) => ({
          id,
          name: districtMap.get(id) ?? id,
        })),
        address: station.address,
        phone: station.phone,
        description: station.description,
        isActive: station.isActive,
        manager: manager
          ? { id: manager.id, name: `${manager.firstName} ${manager.lastName}`.trim(), phone: manager.phone }
          : null,
        counts: {
          ambulances: station._count.ambulances,
          drivers: counts.drivers,
          nurses: counts.nurses,
          dispatchers: counts.dispatchers,
          activeCases: station._count.emergencyRequests,
        },
        capacity: {
          ambulances: station._count.ambulances,
          staff: counts.drivers + counts.nurses + counts.dispatchers,
        },
      };
    });
  }

  async findOne(id: string) {
    const station = await this.prisma.station.findUnique({
      where: { id },
      include: {
        region: true,
        district: true,
        ambulances: {
          where: { isActive: true },
          include: { equipmentLevel: true },
        },
        employees: {
          where: { status: 'ACTIVE' },
          include: { employeeRole: true, user: { select: { email: true } } },
        },
        emergencyRequests: {
          where: { status: { notIn: [...TERMINAL_STATUSES] } },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: { select: { fullName: true } },
            driver: { select: { firstName: true, lastName: true } },
            nurse: { select: { firstName: true, lastName: true } },
            ambulance: { select: { ambulanceNumber: true } },
          },
        },
        transfersFrom: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            toStation: { select: { id: true, name: true } },
            transferredBy: { select: { firstName: true, lastName: true } },
            emergencyRequest: { select: { trackingCode: true } },
          },
        },
        transfersTo: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            fromStation: { select: { id: true, name: true } },
            transferredBy: { select: { firstName: true, lastName: true } },
            emergencyRequest: { select: { trackingCode: true } },
          },
        },
      },
    });

    if (!station) throw new NotFoundException('Station not found');

    const allDistricts = await this.prisma.district.findMany({
      select: { id: true, name: true },
    });
    const districtMap = new Map(allDistricts.map((d) => [d.id, d.name]));
    const coverageIds = parseCoverageIds(station.coverageDistrictIds);

    const staff = {
      dispatchers: station.employees.filter((e) => e.employeeRole.name.toLowerCase().includes('dispatcher')),
      drivers: station.employees.filter((e) => e.employeeRole.name.toLowerCase().includes('driver')),
      nurses: station.employees.filter((e) => e.employeeRole.name.toLowerCase().includes('nurse')),
    };

    const completedCount = await this.prisma.emergencyRequest.count({
      where: { stationId: id, status: 'COMPLETED' },
    });

    return {
      ...station,
      coverageDistricts: coverageIds.map((did) => ({
        id: did,
        name: districtMap.get(did) ?? did,
      })),
      staff,
      performance: {
        activeCases: station.emergencyRequests.length,
        completedCases: completedCount,
      },
    };
  }

  async getCoverageMap() {
    const [stations, districts, regions] = await Promise.all([
      this.prisma.station.findMany({
        where: { isActive: true },
        include: {
          district: { select: { id: true, name: true } },
          region: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.district.findMany({
        where: { isActive: true },
        select: { id: true, name: true, regionId: true },
      }),
      this.prisma.region.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
    ]);

    const coveredDistrictIds = new Set<string>();
    const stationCoverage = stations.map((station) => {
      const coverageIds = parseCoverageIds(station.coverageDistrictIds);
      coveredDistrictIds.add(station.districtId);
      coverageIds.forEach((id) => coveredDistrictIds.add(id));

      const home = districts.find((d) => d.id === station.districtId);
      const coverage = coverageIds
        .map((id) => districts.find((d) => d.id === id))
        .filter(Boolean);

      return {
        id: station.id,
        name: station.name,
        code: station.code,
        region: station.region,
        homeDistrict: home ?? station.district,
        coverageDistricts: coverage,
      };
    });

    const uncoveredDistricts = districts.filter((d) => !coveredDistrictIds.has(d.id));

    return {
      stations: stationCoverage,
      uncoveredDistricts: uncoveredDistricts.map((d) => ({
        ...d,
        region: regions.find((r) => r.id === d.regionId)?.name ?? null,
      })),
      regions,
    };
  }

  async getTransfers(options: {
    limit?: number
    stationId?: string
    fromStationId?: string
    toStationId?: string
    startDate?: string
    endDate?: string
    reason?: string
    search?: string
    priority?: string
    caseStatus?: string
  } = {}) {
    const limit = options.limit ?? 200
    const where: Record<string, unknown> = {}

    if (options.fromStationId) where.fromStationId = options.fromStationId
    if (options.toStationId) where.toStationId = options.toStationId
    if (options.stationId && !options.fromStationId && !options.toStationId) {
      where.OR = [
        { fromStationId: options.stationId },
        { toStationId: options.stationId },
      ]
    }
    if (options.startDate || options.endDate) {
      const createdAt: Record<string, Date> = {}
      if (options.startDate) {
        const start = new Date(options.startDate)
        start.setHours(0, 0, 0, 0)
        createdAt.gte = start
      }
      if (options.endDate) {
        const end = new Date(options.endDate)
        end.setHours(23, 59, 59, 999)
        createdAt.lte = end
      }
      where.createdAt = createdAt
    }
    if (options.reason?.trim()) {
      where.reason = { contains: options.reason.trim(), mode: 'insensitive' }
    }
    if (options.priority?.trim() || options.caseStatus?.trim() || options.search?.trim()) {
      where.emergencyRequest = {
        ...(options.priority?.trim() ? { priority: options.priority.trim() } : {}),
        ...(options.caseStatus?.trim() ? { status: options.caseStatus.trim() } : {}),
        ...(options.search?.trim()
          ? {
              OR: [
                { trackingCode: { contains: options.search.trim(), mode: 'insensitive' } },
                { id: { contains: options.search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      }
    }

    const transfers = await this.prisma.emergencyCaseTransfer.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fromStation: { select: { id: true, name: true, code: true } },
        toStation: { select: { id: true, name: true, code: true } },
        transferredBy: { select: { id: true, firstName: true, lastName: true } },
        emergencyRequest: {
          select: {
            id: true,
            trackingCode: true,
            status: true,
            priority: true,
            stationId: true,
          },
        },
      },
    });

    return transfers.map((t) => ({
      id: t.id,
      trackingCode: t.emergencyRequest.trackingCode,
      caseId: t.emergencyRequest.id,
      caseStatus: t.emergencyRequest.status,
      priority: t.emergencyRequest.priority,
      fromStation: t.fromStation,
      toStation: t.toStation,
      reason: t.reason,
      transferredBy: t.transferredBy
        ? `${t.transferredBy.firstName} ${t.transferredBy.lastName}`.trim()
        : null,
      transferredAt: t.createdAt,
      accepted: t.emergencyRequest.status !== 'PENDING' && t.emergencyRequest.status !== 'CANCELLED',
      completed: t.emergencyRequest.status === 'COMPLETED',
    }));
  }

  private buildTransferAnalytics(
    transfers: Array<{
      fromStation?: { id: string; name: string } | null
      toStation?: { id: string; name: string } | null
      reason?: string | null
    }>,
    stations: Array<{ id: string; name: string }>,
  ) {
    const byStation = new Map<string, { name: string; transfersIn: number; transfersOut: number }>()
    for (const s of stations) {
      byStation.set(s.id, { name: s.name, transfersIn: 0, transfersOut: 0 })
    }

    const byReason = new Map<string, number>()
    const byRoute = new Map<string, { from: string; to: string; count: number }>()

    for (const t of transfers) {
      const fromId = t.fromStation?.id
      const toId = t.toStation?.id
      if (fromId && byStation.has(fromId)) {
        byStation.get(fromId)!.transfersOut += 1
      }
      if (toId && byStation.has(toId)) {
        byStation.get(toId)!.transfersIn += 1
      }

      const reason = (t.reason?.trim() || 'Unspecified').slice(0, 120)
      byReason.set(reason, (byReason.get(reason) ?? 0) + 1)

      if (t.fromStation?.name && t.toStation?.name) {
        const key = `${fromId}->${toId}`
        const existing = byRoute.get(key)
        if (existing) existing.count += 1
        else {
          byRoute.set(key, {
            from: t.fromStation.name,
            to: t.toStation.name,
            count: 1,
          })
        }
      }
    }

    return {
      byStation: [...byStation.entries()]
        .map(([id, row]) => ({
          stationId: id,
          stationName: row.name,
          transfersIn: row.transfersIn,
          transfersOut: row.transfersOut,
          total: row.transfersIn + row.transfersOut,
        }))
        .sort((a, b) => b.total - a.total),
      byReason: [...byReason.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      topRoutes: [...byRoute.values()].sort((a, b) => b.count - a.count).slice(0, 15),
      totalTransfers: transfers.length,
    }
  }

  async getStationAmbulances(stationId?: string) {
    return this.prisma.ambulance.findMany({
      where: {
        isActive: true,
        ...(stationId ? { stationId } : {}),
      },
      include: {
        station: { select: { id: true, name: true } },
        equipmentLevel: true,
        employees: {
          where: { employeeRole: { name: { contains: 'Driver', mode: 'insensitive' } } },
          take: 1,
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { ambulanceNumber: 'asc' },
    });
  }

  async getStationStaff(stationId?: string, role?: string) {
    const roleFilter =
      role === 'drivers'
        ? { name: { contains: 'Driver', mode: 'insensitive' as const } }
        : role === 'nurses'
          ? { name: { contains: 'Nurse', mode: 'insensitive' as const } }
          : role === 'dispatchers'
            ? { name: { equals: 'Dispatcher', mode: 'insensitive' as const } }
            : undefined;

    const employees = await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        ...(stationId ? { stationId } : {}),
        ...(roleFilter ? { employeeRole: roleFilter } : {}),
      },
      include: {
        station: { select: { id: true, name: true } },
        employeeRole: true,
        drivenRequests: {
          where: { status: { in: [...ACTIVE_CASE_STATUSES] } },
          take: 1,
          select: { id: true, trackingCode: true, status: true },
        },
        nurseRequests: {
          where: { status: { in: [...ACTIVE_CASE_STATUSES] } },
          take: 1,
          select: { id: true, trackingCode: true, status: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    return employees.map((e) => {
      const activeCase = e.drivenRequests[0] ?? e.nurseRequests[0] ?? null;
      return {
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        phone: e.phone,
        shiftStatus: e.shiftStatus,
        defaultShift: e.defaultShift,
        role: e.employeeRole.name,
        station: e.station,
        currentMission: activeCase,
      };
    });
  }

  async getActiveCases(filters: {
    stationId?: string;
    status?: string;
    priority?: string;
  }) {
    const where: Record<string, unknown> = {
      status: filters.status
        ? filters.status
        : { notIn: [...TERMINAL_STATUSES] },
    };
    if (filters.stationId) where.stationId = filters.stationId;
    if (filters.priority) where.priority = filters.priority;

    return this.prisma.emergencyRequest.findMany({
      where,
      include: {
        patient: { select: { fullName: true, phone: true } },
        station: { select: { id: true, name: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        nurse: { select: { id: true, firstName: true, lastName: true } },
        ambulance: { select: { id: true, ambulanceNumber: true } },
        dispatcher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getFullReports() {
    const [dashboard, performance, stations, transfers, coverage] = await Promise.all([
      this.getDashboard(),
      this.getPerformance(),
      this.findAll(),
      this.getTransfers({ limit: 500 }),
      this.getCoverageMap(),
    ]);

    const totalCoverageDistricts = coverage.stations.reduce(
      (sum, s) => sum + (s.coverageDistricts?.length ?? 0) + 1,
      0,
    );

    const transferAnalytics = this.buildTransferAnalytics(transfers, stations);

    return {
      overview: {
        cards: dashboard.cards,
        charts: dashboard.charts,
      },
      performance,
      stations,
      transfers,
      transferAnalytics,
      coverage: {
        ...coverage,
        totalCoverageDistricts,
        uncoveredCount: coverage.uncoveredDistricts.length,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getPerformance(stationId?: string) {
    const where = stationId ? { stationId } : {};
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, completed, cancelled, transfersIn, transfersOut] = await Promise.all([
      this.prisma.emergencyRequest.count({ where }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'CANCELLED' } }),
      stationId
        ? this.prisma.emergencyCaseTransfer.count({ where: { toStationId: stationId } })
        : this.prisma.emergencyCaseTransfer.count(),
      stationId
        ? this.prisma.emergencyCaseTransfer.count({ where: { fromStationId: stationId } })
        : 0,
    ]);

    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    return {
      cases: { total, completed, cancelled, completionRate },
      transfers: { in: transfersIn, out: transfersOut },
      period: 'all-time',
    };
  }

  async suggestTransferStation(fromStationId: string, districtId?: string) {
    if (districtId) {
      const result = await this.stationCoverage.suggestStationForDistrict(districtId);
      const suggested = result?.suggested;
      if (suggested && suggested.id !== fromStationId) return suggested;
    }

    const stations = await this.findAll();
    const alternatives = stations
      .filter((s) => s.isActive && s.id !== fromStationId)
      .sort((a, b) => {
        const aAvail = a.counts.ambulances - a.counts.activeCases;
        const bAvail = b.counts.ambulances - b.counts.activeCases;
        return bAvail - aAvail;
      });

    return alternatives[0] ?? null;
  }
}
