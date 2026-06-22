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
  staffRole?: string;
  hospital?: string;
};

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
    const [total, active, completed, cancelled, critical, pending, statusGroups, priorityGroups, trends, recent] =
      await Promise.all([
        this.prisma.emergencyRequest.count({ where }),
        this.prisma.emergencyRequest.count({
          where: { ...where, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        }),
        this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
        this.prisma.emergencyRequest.count({ where: { ...where, status: 'CANCELLED' } }),
        this.prisma.emergencyRequest.count({ where: { ...where, priority: 'CRITICAL' } }),
        this.prisma.emergencyRequest.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.emergencyRequest.groupBy({ by: ['status'], where, _count: true }),
        this.prisma.emergencyRequest.groupBy({ by: ['priority'], where, _count: true }),
        this.getDailyEmergencyTrend(period, {}, filters),
        this.getRecentEmergencyRows(where),
      ]);

    return {
      title: 'Emergency Reports',
      subtitle: 'Emergency request volume, priorities, live workload, and recent cases.',
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
      charts: [
        { title: 'Daily Emergency Trend', type: 'bar', data: trends, xKey: 'label', series: [{ key: 'requests', label: 'Requests' }, { key: 'completed', label: 'Completed' }] },
        { title: 'Emergency Area Trend', type: 'area', data: trends, xKey: 'label', series: [{ key: 'requests', label: 'Requests' }] },
        { title: 'Priority Distribution', type: 'pie', data: this.groupRows(priorityGroups, 'priority') },
        { title: 'Status Distribution', type: 'pie', data: this.groupRows(statusGroups, 'status') },
      ],
      table: {
        title: 'Recent Emergency Cases',
        columns: ['Tracking Code', 'Patient', 'Priority', 'Status', 'Pickup', 'Created'],
        rows: recent,
      },
    };
  }

  private async getAmbulanceUtilizationReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const ambulanceWhere: any = { isActive: true };
    if (filters.ambulance) {
      ambulanceWhere.OR = [
        { id: filters.ambulance },
        { ambulanceNumber: { contains: filters.ambulance, mode: 'insensitive' } },
        { plateNumber: { contains: filters.ambulance, mode: 'insensitive' } },
      ];
    }
    if (filters.vehicleType) {
      ambulanceWhere.vehicleType = { contains: filters.vehicleType, mode: 'insensitive' };
    }
    const [total, byStatus, ambulances, assignedRequests, completedRequests] = await Promise.all([
      this.prisma.ambulance.count({ where: ambulanceWhere }),
      this.prisma.ambulance.groupBy({ by: ['status'], where: ambulanceWhere, _count: true }),
      this.prisma.ambulance.findMany({
        where: ambulanceWhere,
        take: 25,
        orderBy: [{ status: 'asc' }, { ambulanceNumber: 'asc' }],
        include: { station: true, employees: { include: { employeeRole: true } }, emergencyRequests: { where, select: { id: true, status: true } } },
      }),
      this.prisma.emergencyRequest.count({ where: { ...where, ambulanceId: { not: null } } }),
      this.prisma.emergencyRequest.count({ where: { ...where, ambulanceId: { not: null }, status: 'COMPLETED' } }),
    ]);

    const available = byStatus.find((s) => s.status === 'AVAILABLE')?._count ?? 0;
    const onDuty = byStatus.find((s) => s.status === 'ON_DUTY')?._count ?? 0;
    const maintenance = byStatus.find((s) => s.status === 'MAINTENANCE')?._count ?? 0;

    return {
      title: 'Ambulance Utilization',
      subtitle: 'Fleet readiness, assignment load, maintenance backlog, and crew coverage.',
      period,
      summary: [
        { label: 'Total Ambulances', value: total },
        { label: 'Available', value: available },
        { label: 'On Duty', value: onDuty },
        { label: 'Maintenance', value: maintenance },
        { label: 'Assigned Missions', value: assignedRequests },
        { label: 'Fleet Utilization', value: this.percent(onDuty + assignedRequests, Math.max(total, 1) + assignedRequests), suffix: '%' },
      ],
      charts: [
        { title: 'Fleet Status', type: 'pie', data: this.groupRows(byStatus, 'status') },
        { title: 'Daily Assigned Missions', type: 'bar', data: await this.getDailyEmergencyTrend(period, { ambulanceId: { not: null } }, filters), xKey: 'label', series: [{ key: 'requests', label: 'Assigned' }, { key: 'completed', label: 'Completed' }] },
      ],
      table: {
        title: 'Ambulance Utilization Details',
        columns: ['Ambulance', 'Status', 'Station', 'Crew', 'Period Missions', 'Completed'],
        rows: ambulances.map((a) => [
          a.ambulanceNumber,
          a.status,
          a.station?.name ?? 'Unassigned',
          a.employees.length,
          a.emergencyRequests.length,
          a.emergencyRequests.filter((r) => r.status === 'COMPLETED').length,
        ]),
      },
      notes: [`${completedRequests} ambulance missions completed in the selected period.`],
    };
  }

  private async getStaffPerformanceReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const employeeWhere: any = {};
    if (filters.staffRole) {
      employeeWhere.employeeRole = { name: { contains: filters.staffRole, mode: 'insensitive' } };
    }
    const [employees, activeStaff, attendance, completed] = await Promise.all([
      this.prisma.employee.findMany({
        where: employeeWhere,
        take: 30,
        orderBy: { updatedAt: 'desc' },
        include: {
          employeeRole: true,
          station: true,
          _count: { select: { drivenRequests: true, nurseRequests: true, dispatchedRequests: true, attendanceRecords: true } },
        },
      }),
      this.prisma.employee.count({ where: { ...employeeWhere, shiftStatus: { not: 'OFF_DUTY' }, status: 'ACTIVE' } }),
      this.prisma.attendanceRecord.count({ where: { date: { gte: period.start, lte: period.end } } }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
    ]);

    const roleCounts = employees.reduce<Record<string, number>>((acc, employee) => {
      const role = employee.employeeRole?.name ?? 'Unassigned';
      acc[role] = (acc[role] ?? 0) + 1;
      return acc;
    }, {});

    return {
      title: 'Staff Performance Reports',
      subtitle: 'Crew availability, mission workload, attendance activity, and staff productivity.',
      period,
      summary: [
        { label: 'Total Staff', value: employees.length },
        { label: 'Active Staff', value: activeStaff },
        { label: 'Attendance Records', value: attendance },
        { label: 'Completed Cases', value: completed },
        { label: 'Staff Utilization', value: this.percent(activeStaff, employees.length), suffix: '%' },
        { label: 'Avg Missions / Staff', value: employees.length ? Math.round(completed / employees.length) : 0 },
      ],
      charts: [
        { title: 'Staff by Role', type: 'pie', data: Object.entries(roleCounts).map(([name, value]) => ({ name, value })) },
      ],
      table: {
        title: 'Staff Scorecard',
        columns: ['Employee', 'Role', 'Station', 'Shift Status', 'Driver Cases', 'Nurse Cases', 'Dispatch Cases'],
        rows: employees.map((e) => [
          `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.employeeCode || 'Unnamed',
          e.employeeRole?.name ?? 'Unassigned',
          e.station?.name ?? 'Unassigned',
          e.shiftStatus,
          e._count.drivenRequests,
          e._count.nurseRequests,
          e._count.dispatchedRequests,
        ]),
      },
    };
  }

  private async getHospitalAcceptanceReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const hospitalWhere: any = {};
    if (filters.hospital) {
      hospitalWhere.OR = [
        { id: filters.hospital },
        { name: { contains: filters.hospital, mode: 'insensitive' } },
      ];
    }
    const [hospitals, referrals, accepted, rejected, completed, destinationCases] = await Promise.all([
      this.prisma.hospital.findMany({
        where: hospitalWhere,
        take: 30,
        orderBy: { name: 'asc' },
        include: { region: true, district: true, referrals: { where: { createdAt: { gte: period.start, lte: period.end } } }, requests: { where } },
      }),
      this.prisma.referral.count({ where: { createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.referral.count({ where: { status: 'ACCEPTED', createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.referral.count({ where: { status: 'REJECTED', createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.referral.count({ where: { status: 'COMPLETED', createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.emergencyRequest.count({ where: { ...where, destinationHospitalId: { not: null } } }),
    ]);
    const referralGroups = await this.prisma.referral.groupBy({
      by: ['status'],
      where: { createdAt: { gte: period.start, lte: period.end } },
      _count: true,
    });

    return {
      title: 'Hospital Acceptance Reports',
      subtitle: 'Referral acceptance, hospital capacity signals, and destination case load.',
      period,
      summary: [
        { label: 'Referrals', value: referrals },
        { label: 'Accepted', value: accepted },
        { label: 'Rejected', value: rejected },
        { label: 'Completed', value: completed },
        { label: 'Acceptance Rate', value: this.percent(accepted + completed, referrals), suffix: '%' },
        { label: 'Destination Cases', value: destinationCases },
      ],
      charts: [
        { title: 'Referral Outcomes', type: 'pie', data: this.groupRows(referralGroups, 'status') },
      ],
      table: {
        title: 'Hospital Performance',
        columns: ['Hospital', 'Status', 'Beds', 'ER Ready', 'Region', 'Referrals', 'Destination Cases'],
        rows: hospitals.map((h) => [
          h.name,
          h.status,
          h.beds,
          h.erReady ? 'Yes' : 'No',
          h.region?.name ?? 'Unassigned',
          h.referrals.length,
          h.requests.length,
        ]),
      },
    };
  }

  private async getResponseTimeReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const [avg, completed, priorityGroups, regionGroups, trend] = await Promise.all([
      this.prisma.emergencyRequest.aggregate({ where: { ...where, responseMinutes: { not: null } }, _avg: { responseMinutes: true, serviceMinutes: true } }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.groupBy({
        by: ['priority'],
        where: { ...where, responseMinutes: { not: null } },
        _avg: { responseMinutes: true },
        _count: true,
      }),
      this.getRegionResponseRows(where),
      this.getDailyResponseTrend(period, filters),
    ]);

    return {
      title: 'Response Time Analysis',
      subtitle: 'Average response, service duration, regional response, and priority performance.',
      period,
      summary: [
        { label: 'Avg Response', value: Math.round(avg._avg.responseMinutes ?? 0), suffix: ' min' },
        { label: 'Avg Service Time', value: Math.round(avg._avg.serviceMinutes ?? 0), suffix: ' min' },
        { label: 'Measured Cases', value: priorityGroups.reduce((sum, row) => sum + row._count, 0) },
        { label: 'Completed Cases', value: completed },
      ],
      charts: [
        { title: 'Daily Avg Response', type: 'line', data: trend, xKey: 'label', series: [{ key: 'avgResponse', label: 'Avg Response (min)' }] },
        { title: 'Avg by Priority', type: 'bar', data: priorityGroups.map((row) => ({ label: row.priority, avgResponse: Math.round(row._avg.responseMinutes ?? 0), cases: row._count })), xKey: 'label', series: [{ key: 'avgResponse', label: 'Avg Response' }, { key: 'cases', label: 'Cases' }] },
      ],
      table: {
        title: 'Regional Response Detail',
        columns: ['Region', 'Measured Cases', 'Avg Response', 'Avg Service'],
        rows: regionGroups,
      },
    };
  }

  private async getCaseOutcomeReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const [total, completed, cancelled, statusGroups, careRecords, incidents, recent] = await Promise.all([
      this.prisma.emergencyRequest.count({ where }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.emergencyRequest.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.patientCareRecord.count({ where: { createdAt: { gte: period.start, lte: period.end } } }),
      this.prisma.incidentReport.count({ where: { createdAt: { gte: period.start, lte: period.end } } }),
      this.getRecentEmergencyRows(where),
    ]);

    return {
      title: 'Case Outcome Reports',
      subtitle: 'Completed, cancelled, active, patient care, and incident outcome indicators.',
      period,
      summary: [
        { label: 'Total Cases', value: total },
        { label: 'Completed', value: completed },
        { label: 'Cancelled', value: cancelled },
        { label: 'Completion Rate', value: this.percent(completed, total), suffix: '%' },
        { label: 'Care Records', value: careRecords },
        { label: 'Incident Reports', value: incidents },
      ],
      charts: [
        { title: 'Case Outcomes', type: 'pie', data: this.groupRows(statusGroups, 'status') },
        { title: 'Daily Outcomes', type: 'bar', data: await this.getDailyEmergencyTrend(period, {}, filters), xKey: 'label', series: [{ key: 'requests', label: 'Total' }, { key: 'completed', label: 'Completed' }] },
      ],
      table: {
        title: 'Recent Case Outcomes',
        columns: ['Tracking Code', 'Patient', 'Priority', 'Status', 'Pickup', 'Created'],
        rows: recent,
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
      subtitle: 'Download-ready report bundles for management review and auditing.',
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
          ['Emergency Reports', emergency.table.rows.length, 'CSV / JSON', 'Ready'],
          ['Ambulance Utilization', utilization.table.rows.length, 'CSV / JSON', 'Ready'],
          ['Staff Performance Reports', performance.table.rows.length, 'CSV / JSON', 'Ready'],
          ['Hospital Acceptance Reports', hospitals.table.rows.length, 'CSV / JSON', 'Ready'],
          ['Response Time Analysis', responseTime.table.rows.length, 'CSV / JSON', 'Ready'],
          ['Case Outcome Reports', outcomes.table.rows.length, 'CSV / JSON', 'Ready'],
        ],
      },
    };
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
    if (filters.region) {
      where.OR = [
        ...(where.OR ?? []),
        { regionId: filters.region },
        { region: { name: { contains: filters.region, mode: 'insensitive' } } },
      ];
    }
    if (filters.district) {
      where.OR = [
        ...(where.OR ?? []),
        { districtId: filters.district },
        { district: { name: { contains: filters.district, mode: 'insensitive' } } },
      ];
    }
    if (filters.emergencyType) {
      where.incidentCategory = { name: { contains: filters.emergencyType, mode: 'insensitive' } };
    }
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
