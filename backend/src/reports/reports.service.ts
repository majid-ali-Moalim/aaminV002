import { Injectable } from '@nestjs/common';
import { EmergencyRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ReportPeriod = {
  start: Date;
  end: Date;
  range: string;
  label: string;
};

type AdminReportFilters = {
  range?: string;
  startDate?: string;
  endDate?: string;
  region?: string;
  district?: string;
  priority?: string;
  status?: string;
  emergencyType?: string;
  ambulance?: string;
  vehicleType?: string;
  ambulanceStatus?: string;
  staffRole?: string;
  hospital?: string;
};

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const EMERGENCY_STATUS_OPTIONS = [
  'PENDING', 'REVIEWING', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE',
  'PATIENT_STABILIZED', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'COMPLETED', 'CANCELLED',
] as const;
const AMBULANCE_STATUS_OPTIONS = ['AVAILABLE', 'ON_DUTY', 'MAINTENANCE', 'UNAVAILABLE'] as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard Overview Stats ───
  async getDashboardStats() {
    const [
      activeEmergencies,
      availableAmbulances,
      totalUsersCount,
      totalDrivers,
      totalPatients,
      completedCases,
      pendingRequests,
      referralCount,
      recentEmergencies,
      recentReferrals,
      recentEmployees
    ] = await Promise.all([
      this.prisma.emergencyRequest.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }
      }),
      this.prisma.ambulance.count({
        where: { status: 'AVAILABLE' }
      }),
      this.prisma.user.count(),
      this.prisma.employee.count({
        where: { employeeRole: { name: { contains: 'Driver', mode: 'insensitive' } } }
      }),
      this.prisma.patient.count(),
      this.prisma.emergencyRequest.count({
        where: { status: 'COMPLETED' }
      }),
      this.prisma.emergencyRequest.count({
        where: { status: 'PENDING' }
      }),
      this.prisma.referral.count(),
      this.prisma.emergencyRequest.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { patient: true }
      }),
      this.prisma.referral.findMany({
        take: 2,
        orderBy: { createdAt: 'desc' },
        include: { emergencyRequest: { include: { patient: true } } }
      }),
      this.prisma.employee.findMany({
        take: 2,
        orderBy: { createdAt: 'desc' },
        include: { user: true, employeeRole: true }
      })
    ]);

    const activity: any[] = [];

    recentEmergencies.forEach(e => {
      activity.push({
        id: `e-${e.id}`,
        type: 'emergency',
        description: `New emergency request for ${e.patient.fullName}`,
        time: this.formatTimeAgo(e.createdAt),
        createdAt: e.createdAt,
        rawDate: e.createdAt,
        status: e.status === 'PENDING' ? 'warning' : 'success'
      });
    });

    recentReferrals.forEach(r => {
      activity.push({
        id: `r-${r.id}`,
        type: 'referral',
        description: `Referral to ${r.hospitalName} for ${r.emergencyRequest.patient.fullName}`,
        time: this.formatTimeAgo(r.createdAt),
        createdAt: r.createdAt,
        rawDate: r.createdAt,
        status: 'success'
      });
    });

    recentEmployees.forEach(emp => {
      activity.push({
        id: `emp-${emp.id}`,
        type: 'user',
        description: `New ${emp.employeeRole?.name || 'employee'} registered: ${emp.firstName || emp.user.username}`,
        time: this.formatTimeAgo(emp.createdAt),
        createdAt: emp.createdAt,
        rawDate: emp.createdAt,
        status: 'success'
      });
    });

    activity.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    return {
      stats: {
        activeEmergencies,
        availableAmbulances,
        totalUsers: totalUsersCount,
        totalDrivers,
        totalPatients,
        completedCases,
        pendingRequests,
        referralCount
      },
      recentActivity: activity.slice(0, 5)
    };
  }

  // ─── Emergency KPIs ───
  async getEmergencyKPIs(timeRange?: string) {
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const dateFilter = { createdAt: { gte: startDate } };

    const [
      totalInPeriod,
      completedInPeriod,
      cancelledInPeriod,
      criticalInPeriod,
      activeNow,
      pendingNow
    ] = await Promise.all([
      this.prisma.emergencyRequest.count({ where: dateFilter }),
      this.prisma.emergencyRequest.count({ where: { status: 'COMPLETED', ...dateFilter } }),
      this.prisma.emergencyRequest.count({ where: { status: 'CANCELLED', ...dateFilter } }),
      this.prisma.emergencyRequest.count({ where: { priority: 'CRITICAL', ...dateFilter } }),
      // Active = not COMPLETED, not CANCELLED
      this.prisma.emergencyRequest.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }
      }),
      this.prisma.emergencyRequest.count({ where: { status: 'PENDING' } })
    ]);

    const successRate = totalInPeriod > 0
      ? Math.round((completedInPeriod / totalInPeriod) * 100)
      : 0;

    const criticalResponseRate = criticalInPeriod > 0
      ? Math.round(((criticalInPeriod - cancelledInPeriod) / criticalInPeriod) * 100)
      : 0;

    return {
      totalInPeriod,
      completedInPeriod,
      cancelledInPeriod,
      criticalInPeriod,
      activeNow,
      pendingNow,
      successRate,
      growthRate: 0,
      averageHandlingTime: 0,
      criticalResponseRate,
      patientOutcomes: {
        recovered: completedInPeriod,
        cancelled: cancelledInPeriod,
        active: activeNow
      }
    };
  }

  // ─── Performance Metrics ───
  async getPerformanceMetrics() {
    const [
      totalRequests,
      completedRequests,
      cancelledRequests,
      totalAmbulances,
      activeAmbulances,
      totalEmployees,
      onShiftEmployees
    ] = await Promise.all([
      this.prisma.emergencyRequest.count(),
      this.prisma.emergencyRequest.count({ where: { status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.count({ where: { status: 'CANCELLED' } }),
      this.prisma.ambulance.count(),
      // AVAILABLE or ON_DUTY are the active statuses per the enum
      this.prisma.ambulance.count({ where: { status: { in: ['AVAILABLE', 'ON_DUTY'] } } }),
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { shiftStatus: { not: 'OFF_DUTY' } } })
    ]);

    const successRate = totalRequests > 0
      ? Math.round((completedRequests / totalRequests) * 100)
      : 0;
    const delayRate = totalRequests > 0
      ? Math.round((cancelledRequests / totalRequests) * 100)
      : 0;
    const fleetUtilization = totalAmbulances > 0
      ? Math.round((activeAmbulances / totalAmbulances) * 100)
      : 0;
    const staffUtilization = totalEmployees > 0
      ? Math.round((onShiftEmployees / totalEmployees) * 100)
      : 0;

    return {
      totalRequests,
      completedRequests,
      cancelledRequests,
      successRate,
      delayRate,
      averageResponseTime: 0,
      averageDispatchTime: 0,
      timeToHospital: 0,
      nightResponseEfficiency: 0,
      peakHourLoad: 0,
      averageTurnaroundTime: 0,
      systemEfficiency: Math.round((successRate + fleetUtilization + staffUtilization) / 3),
      resourceUtilizationRate: fleetUtilization,
      fleetUtilization,
      staffUtilization
    };
  }

  // ─── Resource Utilization ───
  async getResourceUtilization() {
    const [
      totalAmbulances,
      availableAmbulances,
      onDutyAmbulances,
      maintenanceAmbulances,
      totalEmployees,
      onShiftEmployees,
      totalDrivers,
      totalNurses,
    ] = await Promise.all([
      this.prisma.ambulance.count(),
      this.prisma.ambulance.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.ambulance.count({ where: { status: 'ON_DUTY' } }),
      this.prisma.ambulance.count({ where: { status: 'MAINTENANCE' } }),
      this.prisma.employee.count(),
      this.prisma.employee.count({ where: { shiftStatus: { not: 'OFF_DUTY' } } }),
      this.prisma.employee.count({
        where: { employeeRole: { name: { contains: 'Driver', mode: 'insensitive' } } }
      }),
      this.prisma.employee.count({
        where: { employeeRole: { name: { contains: 'Nurse', mode: 'insensitive' } } }
      }),
    ]);

    const fleetUtilizationRate = totalAmbulances > 0
      ? Math.round(((onDutyAmbulances + availableAmbulances) / totalAmbulances) * 100)
      : 0;
    const staffProductivityRate = totalEmployees > 0
      ? Math.round((onShiftEmployees / totalEmployees) * 100)
      : 0;
    const efficiency = Math.round((fleetUtilizationRate + staffProductivityRate) / 2);

    return {
      totalAmbulances,
      availableAmbulances,
      onDutyAmbulances,
      maintenanceAmbulances,
      totalEmployees,
      activeEmployees: onShiftEmployees,
      totalDrivers,
      totalNurses,
      fleetUtilizationRate,
      staffProductivityRate,
      efficiency,
      maintenanceBacklog: maintenanceAmbulances,
      averageDowntime: 0
    };
  }

  // ─── Patient Analytics ───
  async getPatientAnalytics() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalPatients,
      recentPatients,
    ] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.patient.count({
        where: { createdAt: { gte: todayStart } }
      }),
    ]);

    // Gender counts from emergency request data (they have gender field via patient)
    const genderCounts = await this.prisma.patient.groupBy({
      by: ['gender'],
      _count: true,
    });

    const demographics: Record<string, number> = {};
    genderCounts.forEach(g => {
      demographics[g.gender || 'UNKNOWN'] = g._count;
    });

    return {
      totalPatients,
      newToday: recentPatients,
      demographics,
      satisfactionRate: 0,
      averageAge: 0,
      readmissionRate: 0,
      treatmentSuccessRate: 0,
      healthOutcomes: {}
    };
  }

  // ─── Geographic Analytics ───
  async getGeographicAnalytics() {
    const regionGroups = await this.prisma.emergencyRequest.groupBy({
      by: ['regionId'],
      _count: true,
      orderBy: { _count: { regionId: 'desc' } },
      take: 10,
    });

    const districtGroups = await this.prisma.emergencyRequest.groupBy({
      by: ['districtId'],
      _count: true,
      orderBy: { _count: { districtId: 'desc' } },
      take: 10,
    });

    // Get region names
    const regionIds = regionGroups.map(r => r.regionId).filter(Boolean) as string[];
    const regions = await this.prisma.region.findMany({
      where: { id: { in: regionIds } },
      select: { id: true, name: true }
    });
    const regionMap = Object.fromEntries(regions.map(r => [r.id, r.name]));

    const heatZones = regionGroups
      .slice(0, 5)
      .map(r => regionMap[r.regionId || ''] || 'Unknown');

    const regionCounts: Record<string, number> = {};
    regionGroups.forEach(r => {
      const name = regionMap[r.regionId || ''] || 'Unknown';
      regionCounts[name] = r._count;
    });

    const districtCounts: Record<string, number> = {};
    districtGroups.forEach(d => {
      districtCounts[d.districtId || 'Unknown'] = d._count;
    });

    const totalRegions = regionGroups.length;

    return {
      heatZones,
      coverageEfficiency: totalRegions > 0 ? Math.min(totalRegions * 10, 100) : 0,
      responseTimeByRegion: regionCounts,
      incidentDensity: districtCounts,
      serviceCoverage: regionCounts,
      regionalPerformance: regionCounts
    };
  }

  // ─── Weekly Trends ───
  async getWeeklyTrends() {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    const weekData = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - i));
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

        const [requests, completed] = await Promise.all([
          this.prisma.emergencyRequest.count({
            where: { createdAt: { gte: startOfDay, lte: endOfDay } }
          }),
          this.prisma.emergencyRequest.count({
            where: {
              status: 'COMPLETED',
              createdAt: { gte: startOfDay, lte: endOfDay }
            }
          })
        ]);

        return { day: dayNames[startOfDay.getDay()], requests, completed };
      })
    );

    return { data: weekData };
  }

  // ─── Monthly Trends ───
  async getMonthlyTrends() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    const monthData = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const [total, completed] = await Promise.all([
          this.prisma.emergencyRequest.count({
            where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
          }),
          this.prisma.emergencyRequest.count({
            where: {
              status: 'COMPLETED',
              createdAt: { gte: startOfMonth, lte: endOfMonth }
            }
          })
        ]);

        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { month: months[monthDate.getMonth()], total, completed, successRate };
      })
    );

    return { data: monthData };
  }

  // ─── Real-Time Metrics ───
  async getRealTimeMetrics() {
    const [
      activeEmergencies,
      pendingRequests,
      criticalCases,
      availableAmbulances,
      onDutyAmbulances,
      activeStaff
    ] = await Promise.all([
      this.prisma.emergencyRequest.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }
      }),
      this.prisma.emergencyRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.emergencyRequest.count({
        where: { priority: 'CRITICAL', status: { notIn: ['COMPLETED', 'CANCELLED'] } }
      }),
      this.prisma.ambulance.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.ambulance.count({ where: { status: 'ON_DUTY' } }),
      this.prisma.employee.count({ where: { shiftStatus: { not: 'OFF_DUTY' } } })
    ]);

    return {
      activeEmergencies,
      pendingRequests,
      criticalCases,
      availableAmbulances,
      onMissionAmbulances: onDutyAmbulances,
      activeStaff,
      systemStatus: 'operational',
      lastUpdated: new Date().toISOString()
    };
  }

  // ─── Unified Admin Dashboard (single real-time payload) ───
  private readonly DASHBOARD_ACTIVE_MISSION: EmergencyRequestStatus[] = [
    'REVIEWING', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE',
    'PATIENT_STABILIZED', 'TRANSPORTING', 'ARRIVED_HOSPITAL',
  ];

  private async getDashboardKpiMetrics() {
    const now = new Date();
    const closedStatuses: EmergencyRequestStatus[] = ['COMPLETED', 'CANCELLED'];
    const openFilter = { status: { notIn: closedStatuses } };
    const pendingDelayCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const missionDelayCutoff = new Date(now.getTime() - 45 * 60 * 1000);
    const responseWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalEmergencyCases,
      activeCases,
      pendingCases,
      criticalCases,
      delayedCases,
      completedCases,
      cancelledCases,
      hospitalsAvailable,
      activeAssignments,
      ambulances,
      drivers,
      nurses,
      responseTimeRecords,
    ] = await Promise.all([
      this.prisma.emergencyRequest.count(),
      this.prisma.emergencyRequest.count({
        where: { status: { in: this.DASHBOARD_ACTIVE_MISSION } },
      }),
      this.prisma.emergencyRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.emergencyRequest.count({
        where: { priority: 'CRITICAL', ...openFilter },
      }),
      this.prisma.emergencyRequest.count({
        where: {
          status: { notIn: closedStatuses },
          OR: [
            { status: 'PENDING', createdAt: { lt: pendingDelayCutoff } },
            {
              status: { in: this.DASHBOARD_ACTIVE_MISSION },
              updatedAt: { lt: missionDelayCutoff },
            },
          ],
        },
      }),
      this.prisma.emergencyRequest.count({ where: { status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.count({ where: { status: 'CANCELLED' } }),
      this.prisma.hospital.count({
        where: {
          isActive: true,
          acceptEmergencyCases: true,
          availabilityStatus: { in: ['Available', 'Limited Capacity'] },
        },
      }),
      this.prisma.emergencyRequest.findMany({
        where: {
          status: { in: this.DASHBOARD_ACTIVE_MISSION },
          OR: [
            { ambulanceId: { not: null } },
            { driverId: { not: null } },
            { nurseId: { not: null } },
          ],
        },
        select: { ambulanceId: true, driverId: true, nurseId: true },
      }),
      this.prisma.ambulance.findMany({ select: { id: true, status: true } }),
      this.prisma.employee.findMany({
        where: { employeeRole: { name: { equals: 'Driver', mode: 'insensitive' } } },
        select: { id: true, shiftStatus: true, status: true },
      }),
      this.prisma.employee.findMany({
        where: { employeeRole: { name: { equals: 'Nurse', mode: 'insensitive' } } },
        select: { id: true, shiftStatus: true, status: true, medicalClearanceStatus: true },
      }),
      this.prisma.emergencyRequest.findMany({
        where: {
          dispatchedAt: { not: null },
          createdAt: { gte: responseWindowStart },
        },
        select: { createdAt: true, dispatchedAt: true, responseMinutes: true },
      }),
    ]);

    const busyAmbulanceIds = new Set(
      activeAssignments.map((c) => c.ambulanceId).filter(Boolean) as string[],
    );
    const busyDriverIds = new Set(
      activeAssignments.map((c) => c.driverId).filter(Boolean) as string[],
    );
    const busyNurseIds = new Set(
      activeAssignments.map((c) => c.nurseId).filter(Boolean) as string[],
    );

    const availableAmbulances = ambulances.filter(
      (a) => a.status === 'AVAILABLE' && !busyAmbulanceIds.has(a.id),
    ).length;
    const ambulancesOnCase = busyAmbulanceIds.size;

    const availableDrivers = drivers.filter(
      (d) => d.status === 'ACTIVE' && d.shiftStatus === 'AVAILABLE' && !busyDriverIds.has(d.id),
    ).length;
    const availableNurses = nurses.filter(
      (n) =>
        n.status === 'ACTIVE' &&
        n.shiftStatus === 'AVAILABLE' &&
        n.medicalClearanceStatus !== 'PENDING' &&
        !busyNurseIds.has(n.id),
    ).length;

    const responseSamples = responseTimeRecords
      .map((r) => {
        if (r.responseMinutes != null && r.responseMinutes >= 0) return r.responseMinutes;
        if (r.dispatchedAt && r.createdAt) {
          return Math.round(
            (new Date(r.dispatchedAt).getTime() - new Date(r.createdAt).getTime()) / 60000,
          );
        }
        return null;
      })
      .filter((v): v is number => v != null && v >= 0);

    const averageResponseTimeMinutes =
      responseSamples.length > 0
        ? Math.round(responseSamples.reduce((sum, v) => sum + v, 0) / responseSamples.length)
        : null;

    return {
      totalEmergencyCases,
      activeCases,
      pendingCases,
      criticalCases,
      availableAmbulances,
      ambulancesOnCase,
      availableCrew: availableDrivers + availableNurses,
      availableDrivers,
      availableNurses,
      hospitalsAvailable,
      completedCases,
      cancelledCases,
      averageResponseTimeMinutes,
      delayedCases,
    };
  }

  async getUnifiedDashboard() {
    const openFilter = { status: { notIn: ['COMPLETED', 'CANCELLED'] as ('COMPLETED' | 'CANCELLED')[] } };

    const [
      dashboard,
      realtime,
      emergencyKpis,
      performance,
      resources,
      weekly,
      monthly,
      requests,
      ambulances,
      employees,
      priorityGroups,
      criticalAlerts,
      highPriorityCount,
      kpiMetrics,
      hospitals,
    ] = await Promise.all([
      this.getDashboardStats(),
      this.getRealTimeMetrics(),
      this.getEmergencyKPIs('day'),
      this.getPerformanceMetrics(),
      this.getResourceUtilization(),
      this.getWeeklyTrends(),
      this.getMonthlyTrends(),
      this.prisma.emergencyRequest.findMany({
        include: {
          patient: true,
          dispatcher: { include: { user: true, employeeRole: true } },
          driver: { include: { user: true, employeeRole: true } },
          nurse: { include: { user: true, employeeRole: true } },
          ambulance: { include: { station: true } },
          region: true,
          district: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.ambulance.findMany({
        include: { station: true, region: true, district: true },
        orderBy: { ambulanceNumber: 'asc' },
      }),
      this.prisma.employee.findMany({
        include: { user: true, employeeRole: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emergencyRequest.groupBy({
        by: ['priority'],
        _count: true,
      }),
      this.prisma.emergencyRequest.findMany({
        where: { priority: 'CRITICAL', ...openFilter },
        take: 10,
        include: { patient: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.emergencyRequest.count({
        where: { priority: 'HIGH', ...openFilter },
      }),
      this.getDashboardKpiMetrics(),
      this.prisma.hospital.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          availabilityStatus: true,
          capacityStatus: true,
          beds: true,
          occupiedBeds: true,
          acceptEmergencyCases: true,
          erReady: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const hourlyChart = weekly.data.map((row) => ({
      time: row.day,
      cases: row.requests,
    }));

    const priorityColors: Record<string, string> = {
      CRITICAL: '#EF4444',
      HIGH: '#F59E0B',
      MEDIUM: '#3B82F6',
      LOW: '#10B981',
    };

    const priorityDistribution = (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((name) => ({
      name,
      value: priorityGroups.find((g) => g.priority === name)?._count ?? 0,
      color: priorityColors[name],
    }));

    const ambulanceStatus = [
      { name: 'Available', count: kpiMetrics.availableAmbulances, color: '#10B981' },
      { name: 'On Case', count: kpiMetrics.ambulancesOnCase, color: '#3B82F6' },
      { name: 'Maintenance', count: resources.maintenanceAmbulances, color: '#F59E0B' },
      {
        name: 'Unavailable',
        count: Math.max(
          0,
          resources.totalAmbulances -
            kpiMetrics.availableAmbulances -
            kpiMetrics.ambulancesOnCase -
            resources.maintenanceAmbulances,
        ),
        color: '#EF4444',
      },
    ];

    const summary = {
      ...kpiMetrics,
      pendingQueue: kpiMetrics.pendingCases,
      highPriority: highPriorityCount,
      completedCases: kpiMetrics.completedCases,
      cancelledCases: kpiMetrics.cancelledCases,
      completedCasesToday: kpiMetrics.completedCases,
      completedToday: kpiMetrics.completedCases,
      cancelledToday: kpiMetrics.cancelledCases,
      openCases: realtime.activeEmergencies,
    };

    const kpis = [
      {
        key: 'totalEmergencyCases',
        label: 'Total Emergency Cases',
        value: kpiMetrics.totalEmergencyCases,
        format: 'number' as const,
      },
      {
        key: 'activeCases',
        label: 'Active Cases',
        value: kpiMetrics.activeCases,
        format: 'number' as const,
        live: true,
      },
      {
        key: 'pendingCases',
        label: 'Pending Cases',
        value: kpiMetrics.pendingCases,
        format: 'number' as const,
      },
      {
        key: 'criticalCases',
        label: 'Critical Cases',
        value: kpiMetrics.criticalCases,
        format: 'number' as const,
      },
      {
        key: 'availableAmbulances',
        label: 'Available Ambulances',
        value: kpiMetrics.availableAmbulances,
        format: 'number' as const,
      },
      {
        key: 'ambulancesOnCase',
        label: 'Ambulances On Case',
        value: kpiMetrics.ambulancesOnCase,
        format: 'number' as const,
      },
      {
        key: 'availableCrew',
        label: 'Available Crew',
        value: kpiMetrics.availableCrew,
        format: 'number' as const,
      },
      {
        key: 'hospitalsAvailable',
        label: 'Hospitals Available',
        value: kpiMetrics.hospitalsAvailable,
        format: 'number' as const,
      },
      {
        key: 'completedCases',
        label: 'Completed Cases',
        value: kpiMetrics.completedCases,
        format: 'number' as const,
      },
      {
        key: 'delayedCases',
        label: 'Delayed Cases',
        value: kpiMetrics.delayedCases,
        format: 'number' as const,
      },
    ];

    const criticalAlertText = criticalAlerts
      .slice(0, 3)
      .map((r) => {
        const loc = (r.pickupLocation || 'Unknown').split(',')[0];
        return `${r.trackingCode} (${r.patient?.fullName || 'Case'} / ${loc})`;
      })
      .join(' — ');

    return {
      lastUpdated: new Date().toISOString(),
      summary,
      kpis,
      stats: dashboard.stats,
      performance: {
        successRate: performance.successRate,
        systemEfficiency: performance.systemEfficiency,
        ambulanceUtilization: performance.fleetUtilization,
        staffUtilization: performance.staffUtilization,
      },
      resources,
      emergencyKpis,
      charts: {
        hourly: hourlyChart,
        weekly: weekly.data,
        monthly: monthly.data,
        priorityDistribution,
        ambulanceStatus,
        todayBreakdown: [
          { name: 'Pending', count: kpiMetrics.pendingCases, fill: '#F59E0B' },
          { name: 'Critical', count: kpiMetrics.criticalCases, fill: '#EF4444' },
          { name: 'High', count: highPriorityCount, fill: '#EA580C' },
          { name: 'Completed', count: kpiMetrics.completedCases, fill: '#10B981' },
          { name: 'Delayed', count: kpiMetrics.delayedCases, fill: '#F97316' },
          { name: 'Cancelled', count: kpiMetrics.cancelledCases, fill: '#94A3B8' },
        ],
      },
      recentActivity: dashboard.recentActivity,
      criticalAlerts,
      criticalAlertText,
      operational: {
        requests,
        ambulances,
        employees,
      },
      hospitals,
    };
  }

  async getAdminReportFilterOptions() {
    const [regions, districts, incidentCategories, ambulances, hospitals, employeeRoles] =
      await Promise.all([
        this.prisma.region.findMany({
          where: { isActive: true, deletedAt: null },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
        this.prisma.district.findMany({
          where: { isActive: true, deletedAt: null },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, regionId: true },
        }),
        this.prisma.incidentCategory.findMany({
          where: { isActive: true, deletedAt: null },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
        this.prisma.ambulance.findMany({
          where: { isActive: true },
          orderBy: { ambulanceNumber: 'asc' },
          select: { id: true, ambulanceNumber: true, plateNumber: true, vehicleType: true, status: true },
        }),
        this.prisma.hospital.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true, status: true },
        }),
        this.prisma.employeeRole.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
      ]);

    return {
      regions,
      districts,
      incidentCategories,
      ambulances,
      hospitals,
      employeeRoles,
      priorities: PRIORITY_OPTIONS.map((value) => ({ value, label: value })),
      emergencyStatuses: EMERGENCY_STATUS_OPTIONS.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
      ambulanceStatuses: AMBULANCE_STATUS_OPTIONS.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
      vehicleTypes: [...new Set(ambulances.map((a) => a.vehicleType).filter(Boolean))].map((value) => ({
        value: value as string,
        label: value as string,
      })),
    };
  }

  async getAdminReport(
    type: string,
    filters: AdminReportFilters = {},
    actorUserId?: string,
  ) {
    const period = this.resolveReportPeriod(filters);
    const normalizedType = type || 'executive';
    await this.logReportAccess(normalizedType, filters, actorUserId);

    switch (normalizedType) {
      case 'executive':
        return this.getExecutiveDashboardReport(period, filters);
      case 'emergency':
        return this.getEmergencyOperationsReport(period, filters);
      case 'utilization':
        return this.getAmbulanceUtilizationReport(period, filters);
      case 'performance':
        return this.getStaffPerformanceReport(period, filters);
      case 'hospitals':
        return this.getHospitalAcceptanceReport(period, filters);
      case 'response-time':
        return this.getResponseTimeReport(period, filters);
      case 'outcomes':
        return this.getCaseOutcomeReport(period, filters);
      case 'export':
        return this.getExportReport(period, filters);
      default:
        return this.getExecutiveDashboardReport(period, filters);
    }
  }

  private async getExecutiveDashboardReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      emergenciesToday,
      activeAmbulances,
      availableAmbulances,
      activeMissions,
      criticalCases,
      responseAverage,
      totalStaff,
      presentStaff,
      referrals,
      acceptedReferrals,
      fleetStatus,
      trend,
    ] = await Promise.all([
      this.prisma.emergencyRequest.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
      this.prisma.ambulance.count({ where: { status: 'ON_DUTY', isActive: true } }),
      this.prisma.ambulance.count({ where: { status: 'AVAILABLE', isActive: true } }),
      this.prisma.emergencyRequest.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.emergencyRequest.count({ where: { priority: 'CRITICAL', status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.emergencyRequest.aggregate({ where: { ...where, responseMinutes: { not: null } }, _avg: { responseMinutes: true } }),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { status: 'ACTIVE', shiftStatus: { not: 'OFF_DUTY' } } }),
      this.prisma.referral.count({ where: { createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.referral.count({ where: { status: { in: ['ACCEPTED', 'COMPLETED'] }, createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.ambulance.groupBy({ by: ['status'], where: { isActive: true }, _count: true }),
      this.getDailyEmergencyTrend(period, {}, filters),
    ]);

    return {
      title: 'Admin Executive Dashboard',
      subtitle: 'Top-level command intelligence for EMS leadership, operations managers, and administrators.',
      period,
      permissions: ['report.view', 'report.kpi', 'report.export', 'report.audit'],
      summary: [
        { label: 'Total Emergencies Today', value: emergenciesToday },
        { label: 'Active Ambulances', value: activeAmbulances },
        { label: 'Available Ambulances', value: availableAmbulances },
        { label: 'Active Missions', value: activeMissions },
        { label: 'Critical Cases', value: criticalCases },
        { label: 'Average Response Time', value: Math.round(responseAverage._avg.responseMinutes ?? 0), suffix: ' min' },
        { label: 'Staff Attendance Rate', value: this.percent(presentStaff, totalStaff), suffix: '%' },
        { label: 'Hospital Acceptance Rate', value: this.percent(acceptedReferrals, referrals), suffix: '%' },
      ],
      charts: [
        { title: 'Emergency Trend', type: 'area', data: trend, xKey: 'label', series: [{ key: 'requests', label: 'Requests' }, { key: 'completed', label: 'Completed' }] },
        { title: 'Fleet Status', type: 'pie', data: this.groupRows(fleetStatus, 'status') },
      ],
      table: {
        title: 'Executive Actions & Workflows',
        columns: ['Workflow', 'Owner', 'Trigger', 'Expected Outcome'],
        rows: [
          ['Morning Operations Review', 'EMS Administrator', 'Daily at shift start', 'Validate fleet, staff, hospital, and case risk'],
          ['Critical Case Escalation', 'Operations Manager', 'Critical active cases or SLA breach', 'Assign additional resources and notify leadership'],
          ['Hospital Capacity Review', 'Hospital Coordinator', 'High rejection rate', 'Redirect referrals and update hospital readiness'],
          ['Performance Review', 'Department Leads', 'Weekly / monthly cycle', 'Coach low performers and recognize leaderboard staff'],
        ],
      },
    };
  }

  private async getEmergencyOperationsReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const [total, active, completed, cancelled, critical, pending, rows] = await Promise.all([
      this.prisma.emergencyRequest.count({ where }),
      this.prisma.emergencyRequest.count({
        where: { ...where, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.emergencyRequest.count({ where: { ...where, priority: 'CRITICAL' } }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'PENDING' } }),
      this.getFullEmergencyRows(where),
    ]);

    return {
      title: 'Emergency Reports',
      subtitle: 'Complete emergency case listing with filters by region, district, priority, and status.',
      period,
      permissions: ['report.view', 'report.kpi', 'report.export', 'report.audit'],
      summary: [
        { label: 'Total Emergencies', value: total },
        { label: 'Active Cases', value: active },
        { label: 'Completed Cases', value: completed },
        { label: 'Critical Cases', value: critical },
        { label: 'Pending Queue', value: pending },
        { label: 'Cancellation Rate', value: this.percent(cancelled, total), suffix: '%' },
      ],
      table: {
        title: 'All Emergency Cases',
        columns: [
          'Tracking Code', 'Patient', 'Priority', 'Status', 'Region', 'District', 'Category',
          'Pickup', 'Destination', 'Ambulance', 'Driver', 'Nurse', 'Response (min)', 'Service (min)', 'Created', 'Completed',
        ],
        rows,
      },
    };
  }

  private async getAmbulanceUtilizationReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const ambulanceWhere: any = { isActive: true };
    if (filters.ambulance) ambulanceWhere.id = filters.ambulance;
    if (filters.vehicleType) {
      ambulanceWhere.vehicleType = { contains: filters.vehicleType, mode: 'insensitive' };
    }
    if (filters.ambulanceStatus) ambulanceWhere.status = filters.ambulanceStatus;

    const [total, ambulances, assignedRequests, completedRequests, activeMissions] = await Promise.all([
      this.prisma.ambulance.count({ where: ambulanceWhere }),
      this.prisma.ambulance.findMany({
        where: ambulanceWhere,
        orderBy: [{ status: 'asc' }, { ambulanceNumber: 'asc' }],
        include: {
          station: true,
          region: true,
          employees: { include: { employeeRole: true } },
          emergencyRequests: {
            where,
            select: { id: true, status: true, trackingCode: true, priority: true, createdAt: true },
          },
        },
      }),
      this.prisma.emergencyRequest.count({ where: { ...where, ambulanceId: { not: null } } }),
      this.prisma.emergencyRequest.count({ where: { ...where, ambulanceId: { not: null }, status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.count({
        where: { ...where, ambulanceId: { not: null }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
    ]);

    const available = ambulances.filter((a) => a.status === 'AVAILABLE').length;
    const onDuty = ambulances.filter((a) => a.status === 'ON_DUTY').length;
    const maintenance = ambulances.filter((a) => a.status === 'MAINTENANCE').length;

    return {
      title: 'Ambulance Utilization',
      subtitle: 'Full fleet utilization with missions, crew, and station assignment for the selected period.',
      period,
      summary: [
        { label: 'Total Ambulances', value: total },
        { label: 'Available', value: available },
        { label: 'On Duty', value: onDuty },
        { label: 'Maintenance', value: maintenance },
        { label: 'Assigned Missions', value: assignedRequests },
        { label: 'Active Missions', value: activeMissions },
        { label: 'Completed Missions', value: completedRequests },
        { label: 'Fleet Utilization', value: this.percent(onDuty + activeMissions, Math.max(total, 1)), suffix: '%' },
      ],
      table: {
        title: 'Ambulance Utilization Detail',
        columns: [
          'Ambulance', 'Plate', 'Type', 'Status', 'Station', 'Region', 'Crew',
          'Period Missions', 'Active', 'Completed', 'Last Mission',
        ],
        rows: ambulances.map((a) => {
          const missions = a.emergencyRequests;
          const last = missions.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())[0];
          return [
            a.ambulanceNumber,
            a.plateNumber ?? '—',
            a.vehicleType ?? '—',
            a.status,
            a.station?.name ?? 'Unassigned',
            a.region?.name ?? '—',
            a.employees.length,
            missions.length,
            missions.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length,
            missions.filter((r) => r.status === 'COMPLETED').length,
            last ? `${last.trackingCode} (${last.createdAt.toISOString().slice(0, 10)})` : '—',
          ];
        }),
      },
    };
  }

  private async getStaffPerformanceReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const employeeWhere: any = { status: 'ACTIVE' };
    if (filters.staffRole) employeeWhere.employeeRoleId = filters.staffRole;

    const [employees, activeStaff, attendance, completed] = await Promise.all([
      this.prisma.employee.findMany({
        where: employeeWhere,
        orderBy: [{ employeeRole: { name: 'asc' } }, { firstName: 'asc' }],
        include: {
          employeeRole: true,
          department: true,
          station: true,
          user: { select: { email: true, username: true } },
          _count: {
            select: {
              drivenRequests: true,
              nurseRequests: true,
              dispatchedRequests: true,
              attendanceRecords: true,
            },
          },
        },
      }),
      this.prisma.employee.count({ where: { ...employeeWhere, shiftStatus: { not: 'OFF_DUTY' } } }),
      this.prisma.attendanceRecord.count({ where: { date: { gte: period.start, lte: period.end } } }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
    ]);

    const periodCompletedByEmployee = await this.prisma.emergencyRequest.groupBy({
      by: ['driverId'],
      where: { ...where, status: 'COMPLETED', driverId: { not: null } },
      _count: true,
    });
    const driverCompletedMap = Object.fromEntries(
      periodCompletedByEmployee.map((r) => [r.driverId!, r._count]),
    );

    return {
      title: 'Staff Performance Reports',
      subtitle: 'Complete staff scorecard with missions, attendance, and role breakdown.',
      period,
      summary: [
        { label: 'Total Staff', value: employees.length },
        { label: 'Active on Shift', value: activeStaff },
        { label: 'Attendance Records', value: attendance },
        { label: 'Completed Cases (period)', value: completed },
        { label: 'Staff Utilization', value: this.percent(activeStaff, employees.length), suffix: '%' },
        { label: 'Avg Missions / Staff', value: employees.length ? Math.round(completed / employees.length) : 0 },
      ],
      table: {
        title: 'Staff Performance Detail',
        columns: [
          'Employee', 'Role', 'Department', 'Station', 'Shift', 'Status',
          'Driver Cases', 'Nurse Cases', 'Dispatch Cases', 'Period Driver Completions', 'Attendance Records', 'Email',
        ],
        rows: employees.map((e) => [
          this.employeeDisplayName(e),
          e.employeeRole?.name ?? 'Unassigned',
          e.department?.name ?? '—',
          e.station?.name ?? '—',
          e.shiftStatus ?? '—',
          e.status,
          e._count.drivenRequests,
          e._count.nurseRequests,
          e._count.dispatchedRequests,
          driverCompletedMap[e.id] ?? 0,
          e._count.attendanceRecords,
          e.user?.email ?? e.user?.username ?? '—',
        ]),
      },
    };
  }

  private async getHospitalAcceptanceReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const hospitalWhere: any = {};
    if (filters.hospital) hospitalWhere.id = filters.hospital;

    const [hospitals, referrals, accepted, rejected, completed, destinationCases] = await Promise.all([
      this.prisma.hospital.findMany({
        where: hospitalWhere,
        orderBy: { name: 'asc' },
        include: {
          region: true,
          district: true,
          referrals: { where: { createdAt: { gte: period.start, lte: period.end } } },
          requests: { where },
        },
      }),
      this.prisma.referral.count({ where: { createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.referral.count({ where: { status: 'ACCEPTED', createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.referral.count({ where: { status: 'REJECTED', createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.referral.count({ where: { status: 'COMPLETED', createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.emergencyRequest.count({ where: { ...where, destinationHospitalId: { not: null } } }),
    ]);

    return {
      title: 'Hospital Acceptance Reports',
      subtitle: 'Full hospital referral and destination case listing for the selected period.',
      period,
      summary: [
        { label: 'Referrals', value: referrals },
        { label: 'Accepted', value: accepted },
        { label: 'Rejected', value: rejected },
        { label: 'Completed', value: completed },
        { label: 'Acceptance Rate', value: this.percent(accepted + completed, referrals), suffix: '%' },
        { label: 'Destination Cases', value: destinationCases },
      ],
      table: {
        title: 'Hospital Performance Detail',
        columns: [
          'Hospital', 'Status', 'Beds', 'ER Ready', 'Region', 'District',
          'Referrals', 'Accepted', 'Rejected', 'Completed', 'Destination Cases', 'Phone',
        ],
        rows: hospitals.map((h) => [
          h.name,
          h.status,
          h.beds ?? '—',
          h.erReady ? 'Yes' : 'No',
          h.region?.name ?? '—',
          h.district?.name ?? '—',
          h.referrals.length,
          h.referrals.filter((r) => r.status === 'ACCEPTED').length,
          h.referrals.filter((r) => r.status === 'REJECTED').length,
          h.referrals.filter((r) => r.status === 'COMPLETED').length,
          h.requests.length,
          h.primaryPhone ?? h.contactNumber ?? h.emergencyHotline ?? '—',
        ]),
      },
    };
  }

  private async getResponseTimeReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const [avg, completed, rows, regionGroups] = await Promise.all([
      this.prisma.emergencyRequest.aggregate({
        where: { ...where, responseMinutes: { not: null } },
        _avg: { responseMinutes: true, serviceMinutes: true },
      }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      this.getFullResponseTimeRows(where),
      this.getRegionResponseRows(where),
    ]);

    const measured = rows.length;

    return {
      title: 'Response Time Analysis',
      subtitle: 'Case-level response and service duration with regional summary.',
      period,
      summary: [
        { label: 'Avg Response', value: Math.round(avg._avg.responseMinutes ?? 0), suffix: ' min' },
        { label: 'Avg Service Time', value: Math.round(avg._avg.serviceMinutes ?? 0), suffix: ' min' },
        { label: 'Measured Cases', value: measured },
        { label: 'Completed Cases', value: completed },
      ],
      table: {
        title: 'Case Response Time Detail',
        columns: [
          'Tracking Code', 'Patient', 'Priority', 'Status', 'Region', 'District',
          'Response (min)', 'Service (min)', 'Ambulance', 'Created', 'Dispatched', 'Completed',
        ],
        rows,
      },
      secondaryTable: {
        title: 'Regional Response Summary',
        columns: ['Region', 'Measured Cases', 'Avg Response', 'Avg Service'],
        rows: regionGroups,
      },
    };
  }

  private async getCaseOutcomeReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const [total, completed, cancelled, careRecords, incidents, rows] = await Promise.all([
      this.prisma.emergencyRequest.count({ where }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.patientCareRecord.count({ where: { createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.incidentReport.count({ where: { createdAt: { gte: period.start, lte: period.end } } }),
      this.getFullEmergencyRows(where),
    ]);

    return {
      title: 'Case Outcome Reports',
      subtitle: 'Complete case outcome listing with completion and cancellation details.',
      period,
      summary: [
        { label: 'Total Cases', value: total },
        { label: 'Completed', value: completed },
        { label: 'Cancelled', value: cancelled },
        { label: 'Completion Rate', value: this.percent(completed, total), suffix: '%' },
        { label: 'Care Records', value: careRecords },
        { label: 'Incident Reports', value: incidents },
      ],
      table: {
        title: 'All Case Outcomes',
        columns: [
          'Tracking Code', 'Patient', 'Priority', 'Status', 'Region', 'District', 'Category',
          'Pickup', 'Destination', 'Ambulance', 'Response (min)', 'Created', 'Completed',
        ],
        rows: rows.map((row) => [
          row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[12], row[14], row[15],
        ]),
      },
    };
  }

  private async getExportReport(period: ReportPeriod, filters: AdminReportFilters) {
    const [dashboard, emergency, utilization, performance, hospitals, responseTime, outcomes] = await Promise.all([
      this.getDashboardStats(),
      this.getEmergencyOperationsReport(period, filters),
      this.getAmbulanceUtilizationReport(period, filters),
      this.getStaffPerformanceReport(period, filters),
      this.getHospitalAcceptanceReport(period, filters),
      this.getResponseTimeReport(period, filters),
      this.getCaseOutcomeReport(period, filters),
    ]);

    return {
      title: 'Export PDF / Excel',
      subtitle: 'Download complete report datasets for all analytics modules.',
      period,
      summary: [
        { label: 'Available Reports', value: 6 },
        { label: 'Dashboard Metrics', value: Object.keys(dashboard.stats).length },
        { label: 'Generated At', value: new Date().toISOString().slice(0, 16).replace('T', ' ') },
      ],
      exportBundles: [
        { key: 'emergency', label: 'Emergency Reports', rows: emergency.table.rows.length },
        { key: 'utilization', label: 'Ambulance Utilization', rows: utilization.table.rows.length },
        { key: 'performance', label: 'Staff Performance Reports', rows: performance.table.rows.length },
        { key: 'hospitals', label: 'Hospital Acceptance Reports', rows: hospitals.table.rows.length },
        { key: 'response-time', label: 'Response Time Analysis', rows: responseTime.table.rows.length },
        { key: 'outcomes', label: 'Case Outcome Reports', rows: outcomes.table.rows.length },
      ],
      reports: { emergency, utilization, performance, hospitals, 'response-time': responseTime, outcomes },
      table: {
        title: 'Export Packages',
        columns: ['Report', 'Rows', 'Formats', 'Status'],
        rows: [
          ['Emergency Reports', emergency.table.rows.length, 'CSV / JSON / PDF', 'Ready'],
          ['Ambulance Utilization', utilization.table.rows.length, 'CSV / JSON / PDF', 'Ready'],
          ['Staff Performance Reports', performance.table.rows.length, 'CSV / JSON / PDF', 'Ready'],
          ['Hospital Acceptance Reports', hospitals.table.rows.length, 'CSV / JSON / PDF', 'Ready'],
          ['Response Time Analysis', responseTime.table.rows.length, 'CSV / JSON / PDF', 'Ready'],
          ['Case Outcome Reports', outcomes.table.rows.length, 'CSV / JSON / PDF', 'Ready'],
        ],
      },
    };
  }

  private employeeDisplayName(e: {
    firstName?: string | null;
    lastName?: string | null;
    employeeCode?: string | null;
  }) {
    return [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || e.employeeCode || 'Unnamed';
  }

  private async getFullEmergencyRows(where: any) {
    const rows = await this.prisma.emergencyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        region: true,
        district: true,
        incidentCategory: true,
        ambulance: true,
        driver: true,
        nurse: true,
        destinationHospital: true,
      },
    });

    return rows.map((r) => [
      r.trackingCode,
      r.patient?.fullName ?? 'Unknown',
      r.priority,
      r.status,
      r.region?.name ?? '—',
      r.district?.name ?? '—',
      r.incidentCategory?.name ?? '—',
      r.pickupLocation,
      r.destination ?? r.destinationHospital?.name ?? '—',
      r.ambulance?.ambulanceNumber ?? '—',
      r.driver ? this.employeeDisplayName(r.driver) : '—',
      r.nurse ? this.employeeDisplayName(r.nurse) : '—',
      r.responseMinutes ?? '—',
      r.serviceMinutes ?? '—',
      r.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      r.completedAt ? r.completedAt.toISOString().slice(0, 16).replace('T', ' ') : '—',
    ]);
  }

  private async getFullResponseTimeRows(where: any) {
    const rows = await this.prisma.emergencyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        region: true,
        district: true,
        ambulance: true,
      },
    });

    return rows.map((r) => [
      r.trackingCode,
      r.patient?.fullName ?? 'Unknown',
      r.priority,
      r.status,
      r.region?.name ?? '—',
      r.district?.name ?? '—',
      r.responseMinutes ?? '—',
      r.serviceMinutes ?? '—',
      r.ambulance?.ambulanceNumber ?? '—',
      r.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      r.dispatchedAt ? r.dispatchedAt.toISOString().slice(0, 16).replace('T', ' ') : '—',
      r.completedAt ? r.completedAt.toISOString().slice(0, 16).replace('T', ' ') : '—',
    ]);
  }

  private async getRecentEmergencyRows(where: any) {
    const rows = await this.prisma.emergencyRequest.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { patient: true },
    });

    return rows.map((r) => [
      r.trackingCode,
      r.patient?.fullName ?? 'Unknown',
      r.priority,
      r.status,
      r.pickupLocation,
      r.createdAt.toISOString().slice(0, 10),
    ]);
  }

  private async getDailyEmergencyTrend(period: ReportPeriod, extraWhere: any = {}, filters: AdminReportFilters = {}) {
    return Promise.all(
      this.daysInPeriod(period).map(async ({ start, end, label }) => {
        const where = { ...this.emergencyDimensionWhere(filters), ...extraWhere, createdAt: { gte: start, lte: end } };
        const [requests, completed] = await Promise.all([
          this.prisma.emergencyRequest.count({ where }),
          this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
        ]);
        return { label, requests, completed };
      }),
    );
  }

  private async getDailyResponseTrend(period: ReportPeriod, filters: AdminReportFilters = {}) {
    return Promise.all(
      this.daysInPeriod(period).map(async ({ start, end, label }) => {
        const avg = await this.prisma.emergencyRequest.aggregate({
          where: { ...this.emergencyDimensionWhere(filters), createdAt: { gte: start, lte: end }, responseMinutes: { not: null } },
          _avg: { responseMinutes: true },
        });
        return { label, avgResponse: Math.round(avg._avg.responseMinutes ?? 0) };
      }),
    );
  }

  private async getRegionResponseRows(where: any) {
    const groups = await this.prisma.emergencyRequest.groupBy({
      by: ['regionId'],
      where: { ...where, responseMinutes: { not: null } },
      _avg: { responseMinutes: true, serviceMinutes: true },
      _count: true,
    });
    const regions = await this.prisma.region.findMany({
      where: { id: { in: groups.map((g) => g.regionId).filter(Boolean) as string[] } },
      select: { id: true, name: true },
    });
    const regionMap = Object.fromEntries(regions.map((r) => [r.id, r.name]));

    return groups.map((row) => [
      row.regionId ? regionMap[row.regionId] ?? 'Unknown' : 'Unassigned',
      row._count,
      `${Math.round(row._avg.responseMinutes ?? 0)} min`,
      `${Math.round(row._avg.serviceMinutes ?? 0)} min`,
    ]);
  }

  private groupRows<T extends Record<string, any>>(rows: T[], key: keyof T) {
    return rows.map((row) => ({ name: String(row[key] ?? 'Unknown'), value: row._count ?? 0 }));
  }

  private percent(value: number, total: number) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  private reportWhere(period: ReportPeriod, filters: AdminReportFilters = {}) {
    return {
      ...this.emergencyDimensionWhere(filters),
      createdAt: { gte: period.start, lte: period.end },
    };
  }

  private emergencyDimensionWhere(filters: AdminReportFilters = {}) {
    const where: any = {};
    if (filters.priority) where.priority = filters.priority;
    if (filters.status) where.status = filters.status;
    if (filters.region) where.regionId = filters.region;
    if (filters.district) where.districtId = filters.district;
    if (filters.emergencyType) where.incidentCategoryId = filters.emergencyType;
    return where;
  }

  private resolveReportPeriod(filters: AdminReportFilters): ReportPeriod {
    const now = new Date();
    const end = filters.endDate ? new Date(filters.endDate) : now;
    end.setHours(23, 59, 59, 999);

    let start: Date;
    if (filters.startDate) {
      start = new Date(filters.startDate);
    } else {
      const days = filters.range === '7d' ? 7 : filters.range === '90d' ? 90 : filters.range === '365d' ? 365 : 30;
      start = new Date(now);
      start.setDate(now.getDate() - (days - 1));
    }
    start.setHours(0, 0, 0, 0);

    return {
      start,
      end,
      range: filters.range || '30d',
      label: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
    };
  }

  private daysInPeriod(period: ReportPeriod) {
    const days: { start: Date; end: Date; label: string }[] = [];
    const maxDays = 14;
    const totalDays = Math.max(
      1,
      Math.ceil((period.end.getTime() - period.start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );
    const step = Math.max(1, Math.ceil(totalDays / maxDays));

    for (let offset = 0; offset < totalDays; offset += step) {
      const start = new Date(period.start);
      start.setDate(period.start.getDate() + offset);
      const end = new Date(start);
      end.setDate(start.getDate() + step - 1);
      if (end > period.end) end.setTime(period.end.getTime());
      days.push({
        start,
        end,
        label: start.toISOString().slice(5, 10),
      });
    }

    return days;
  }

  private async logReportAccess(type: string, filters: AdminReportFilters, actorUserId?: string) {
    const userId = await this.resolveAuditUserId(actorUserId);
    if (!userId) return;

    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: type === 'export' ? 'REPORT_EXPORT_VIEWED' : 'REPORT_VIEWED',
          entityType: 'AnalyticsReport',
          entityId: type,
          metadata: {
            type,
            filters,
            viewedAt: new Date().toISOString(),
            permissions: type === 'export' ? ['report.view', 'report.export'] : ['report.view'],
          },
        },
      });
    } catch {
      // Audit logging must never block report generation
    }
  }

  private async resolveAuditUserId(actorUserId?: string): Promise<string | null> {
    if (!actorUserId) return null;

    if (actorUserId === 'hardcoded-admin-uuid') {
      const admin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      return admin?.id ?? null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  // ─── Existing methods ───
  create(createReportDto: any) {
    return 'This action adds a new report';
  }

  findAll() {
    return 'This action returns all reports';
  }

  findOne(id: string) {
    return `This action returns a #${id} report`;
  }

  update(id: string, updateReportDto: any) {
    return `This action updates a #${id} report`;
  }

  remove(id: string) {
    return `This action removes a #${id} report`;
  }

  private formatTimeAgo(date: Date) {
    const diff = new Date().getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  private readonly READINESS_ACTIVE_CASES: EmergencyRequestStatus[] = [
    'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE',
    'PATIENT_STABILIZED', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'REVIEWING',
  ];

  async getDispatchReadiness() {
    const closedStatuses = ['COMPLETED', 'CANCELLED'] as const;
    const openFilter = { status: { notIn: [...closedStatuses] } };

    const [ambulances, drivers, nurses, pendingCases, criticalCases, activeCases, stations] =
      await Promise.all([
        this.prisma.ambulance.findMany({
          select: {
            id: true,
            ambulanceNumber: true,
            status: true,
            stationId: true,
            station: { select: { id: true, name: true } },
          },
        }),
        this.prisma.employee.findMany({
          where: { employeeRole: { name: { equals: 'Driver', mode: 'insensitive' } } },
          select: { id: true, shiftStatus: true, status: true, stationId: true, firstName: true, lastName: true },
        }),
        this.prisma.employee.findMany({
          where: { employeeRole: { name: { equals: 'Nurse', mode: 'insensitive' } } },
          select: {
            id: true, shiftStatus: true, status: true, stationId: true,
            firstName: true, lastName: true, medicalClearanceStatus: true,
          },
        }),
        this.prisma.emergencyRequest.count({ where: { status: 'PENDING' } }),
        this.prisma.emergencyRequest.count({ where: { priority: 'CRITICAL', ...openFilter } }),
        this.prisma.emergencyRequest.findMany({
          where: { status: { in: this.READINESS_ACTIVE_CASES }, ambulanceId: { not: null } },
          select: { ambulanceId: true, driverId: true, nurseId: true },
        }),
        this.prisma.station.findMany({
          where: { isActive: true },
          select: { id: true, name: true, region: { select: { name: true } }, district: { select: { name: true } } },
          orderBy: { name: 'asc' },
        }),
      ]);

    const busyAmbulanceIds = new Set(activeCases.map((c) => c.ambulanceId).filter(Boolean));
    const busyDriverIds = new Set(activeCases.map((c) => c.driverId).filter(Boolean));
    const busyNurseIds = new Set(activeCases.map((c) => c.nurseId).filter(Boolean));

    const isAmbAvailable = (a: { status: string; id: string }) =>
      a.status === 'AVAILABLE' && !busyAmbulanceIds.has(a.id);
    const isDriverAvailable = (e: { shiftStatus: string; status: string; id: string }) =>
      e.status === 'ACTIVE' && e.shiftStatus === 'AVAILABLE' && !busyDriverIds.has(e.id);
    const isNurseAvailable = (e: { shiftStatus: string; status: string; id: string; medicalClearanceStatus?: string | null }) =>
      e.status === 'ACTIVE' && e.shiftStatus === 'AVAILABLE' && !busyNurseIds.has(e.id) &&
      e.medicalClearanceStatus !== 'PENDING';

    const ambAvailable = ambulances.filter(isAmbAvailable).length;
    const driverAvailable = drivers.filter(isDriverAvailable).length;
    const nurseAvailable = nurses.filter(isNurseAvailable).length;

    const pct = (avail: number, total: number) => (total ? Math.round((avail / total) * 100) : 0);

    const ambPct = pct(ambAvailable, ambulances.length);
    const driverPct = pct(driverAvailable, drivers.length);
    const nursePct = pct(nurseAvailable, nurses.length);
    const readinessScore = Math.round((ambPct + driverPct + nursePct) / 3);

    let readinessLevel: 'ready' | 'limited' | 'critical' = 'ready';
    if (readinessScore < 50 || pendingCases > ambAvailable) readinessLevel = 'critical';
    else if (readinessScore < 75 || criticalCases > 0) readinessLevel = 'limited';

    const stationReadiness = stations.map((station) => {
      const stationAmbs = ambulances.filter((a) => a.stationId === station.id);
      const stationDrivers = drivers.filter((d) => d.stationId === station.id);
      const stationNurses = nurses.filter((n) => n.stationId === station.id);
      const availAmbs = stationAmbs.filter(isAmbAvailable).length;
      const availDrivers = stationDrivers.filter(isDriverAvailable).length;
      const availNurses = stationNurses.filter(isNurseAvailable).length;
      const stationScore = Math.round(
        (pct(availAmbs, stationAmbs.length) + pct(availDrivers, stationDrivers.length) + pct(availNurses, stationNurses.length)) / 3,
      );
      return {
        id: station.id,
        name: station.name,
        region: station.region?.name ?? null,
        district: station.district?.name ?? null,
        ambulances: { total: stationAmbs.length, available: availAmbs },
        drivers: { total: stationDrivers.length, available: availDrivers },
        nurses: { total: stationNurses.length, available: availNurses },
        readinessScore: stationScore,
        status: stationScore >= 75 ? 'ready' : stationScore >= 40 ? 'limited' : 'critical',
      };
    });

    return {
      summary: {
        readinessScore,
        readinessLevel,
        pendingCases,
        criticalCases,
        activeCases: activeCases.length,
      },
      resources: {
        ambulances: { total: ambulances.length, available: ambAvailable, unavailable: ambulances.length - ambAvailable },
        drivers: { total: drivers.length, available: driverAvailable, unavailable: drivers.length - driverAvailable },
        nurses: { total: nurses.length, available: nurseAvailable, unavailable: nurses.length - nurseAvailable },
      },
      stationReadiness,
      updatedAt: new Date().toISOString(),
    };
  }
}
