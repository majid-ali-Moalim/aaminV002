import { Injectable } from '@nestjs/common';
import { EmergencyRequestStatus, RequestSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeAttendanceService } from '../employee-attendance/employee-attendance.service';
import { isStaffEmployeeRole } from '../employee-attendance/shift-types';

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
  patientOutcome?: string;
  transportType?: string;
};

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const EMERGENCY_STATUS_OPTIONS = [
  'PENDING', 'REVIEWING', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE',
  'PATIENT_STABILIZED', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'COMPLETED', 'CANCELLED',
] as const;
const AMBULANCE_STATUS_OPTIONS = ['AVAILABLE', 'ON_DUTY', 'MAINTENANCE', 'UNAVAILABLE'] as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendance: EmployeeAttendanceService,
  ) {}

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

  // A "real emergency" is any request that isn't a hospital referral/other transfer.
  private readonly EMERGENCY_REQUEST_SOURCES: RequestSource[] = ['PHONE_CALL', 'WALK_IN', 'STAFF'];

  private async getDashboardKpiMetrics() {
    const now = new Date();
    const closedStatuses: EmergencyRequestStatus[] = ['COMPLETED', 'CANCELLED'];
    const openFilter = { status: { notIn: closedStatuses } };
    const pendingDelayCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const missionDelayCutoff = new Date(now.getTime() - 45 * 60 * 1000);
    const responseWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalCases,
      totalEmergencyCases,
      activeCases,
      pendingCases,
      criticalCases,
      delayedCases,
      completedCases,
      cancelledCases,
      hospitalsAvailable,
      totalHospitals,
      totalDispatchers,
      activeAssignments,
      ambulances,
      drivers,
      nurses,
      responseTimeRecords,
    ] = await Promise.all([
      this.prisma.emergencyRequest.count(),
      this.prisma.emergencyRequest.count({
        where: { requestSource: { in: this.EMERGENCY_REQUEST_SOURCES } },
      }),
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
      this.prisma.hospital.count({ where: { isActive: true } }),
      this.prisma.employee.count({
        where: { employeeRole: { name: { equals: 'Dispatcher', mode: 'insensitive' } } },
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
      totalCases,
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
      totalAmbulances: ambulances.length,
      totalDrivers: drivers.length,
      totalNurses: nurses.length,
      totalDispatchers,
      totalHospitals,
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
        key: 'totalCases',
        label: 'Total Cases',
        value: kpiMetrics.totalCases,
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
      {
        key: 'criticalCases',
        label: 'Critical Cases',
        value: kpiMetrics.criticalCases,
        format: 'number' as const,
      },
      {
        key: 'totalAmbulances',
        label: 'Total Ambulances',
        value: kpiMetrics.totalAmbulances,
        format: 'number' as const,
      },
      {
        key: 'totalDrivers',
        label: 'Total Drivers',
        value: kpiMetrics.totalDrivers,
        format: 'number' as const,
      },
      {
        key: 'totalNurses',
        label: 'Total Nurses',
        value: kpiMetrics.totalNurses,
        format: 'number' as const,
      },
      {
        key: 'totalDispatchers',
        label: 'Total Dispatchers',
        value: kpiMetrics.totalDispatchers,
        format: 'number' as const,
      },
      {
        key: 'totalHospitals',
        label: 'Total Hospitals',
        value: kpiMetrics.totalHospitals,
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
    const [regions, districts, incidentCategories, ambulances, hospitals, employeeRoles, transportTypes] =
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
        this.prisma.transportType.findMany({
          where: { isActive: true, deletedAt: null },
          orderBy: { name: 'asc' },
          select: { id: true, code: true, name: true },
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
      patientOutcomes: [
        { value: 'Live', label: 'Live at handover' },
        { value: 'Deceased', label: 'Dead during transfer' },
        { value: 'Unknown', label: 'Outcome not recorded' },
      ],
      transportTypes: transportTypes.map((t) => ({
        value: t.name,
        label: t.name,
        code: t.code,
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
      case 'handover-outcomes':
        return this.getHandoverOutcomeReport(period, filters);
      case 'operations':
        return this.getOperationsIntelligenceReport(period, filters);
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

    const [allEmployees, completed, todayPresence, periodScores] = await Promise.all([
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
      this.prisma.emergencyRequest.count({ where: { ...where, status: 'COMPLETED' } }),
      this.attendance.getTodayStaffPresence(),
      this.attendance.getAttendanceScores({
        startDate: period.start.toISOString().slice(0, 10),
        endDate: period.end.toISOString().slice(0, 10),
      }),
    ]);

    const employees = allEmployees.filter((e) => isStaffEmployeeRole(e.employeeRole?.name));
    const presentTodayIds = new Set(todayPresence.presentEmployeesList.map((e) => e.id));
    const scoreByEmployeeId = Object.fromEntries(
      (periodScores.employees ?? []).map((e) => [e.employeeId, e]),
    );

    const periodCompletedByEmployee = await this.prisma.emergencyRequest.groupBy({
      by: ['driverId'],
      where: { ...where, status: 'COMPLETED', driverId: { not: null } },
      _count: true,
    });
    const driverCompletedMap = Object.fromEntries(
      periodCompletedByEmployee.map((r) => [r.driverId!, r._count]),
    );

    const activeStaff = employees.filter((e) => presentTodayIds.has(e.id)).length;
    const { byRole, fieldStaff } = todayPresence;

    return {
      title: 'Staff Performance Reports',
      subtitle: 'Staff scorecard with today\'s attendance, period scores, missions, and role breakdown.',
      period,
      summary: [
        { label: 'Total Staff', value: employees.length },
        { label: 'Present Today', value: todayPresence.presentEmployees },
        { label: 'Absent Today', value: todayPresence.absentEmployees },
        { label: 'Drivers Present', value: byRole.drivers.present },
        { label: 'Nurses Present', value: byRole.nurses.present },
        { label: 'Dispatchers Present', value: byRole.dispatchers.present },
        { label: 'Drivers Absent', value: byRole.drivers.absent },
        { label: 'Nurses Absent', value: byRole.nurses.absent },
        { label: 'Dispatchers Absent', value: byRole.dispatchers.absent },
        { label: 'Field Staff Present', value: fieldStaff.present },
        { label: 'Period Avg Attendance', value: periodScores.summary?.averageAttendanceRate ?? 0, suffix: '%' },
        { label: 'Completed Cases (period)', value: completed },
        { label: 'Staff Utilization (today)', value: this.percent(activeStaff, employees.length), suffix: '%' },
      ],
      table: {
        title: 'Staff Performance Detail',
        columns: [
          'Employee', 'Role', 'Department', 'Station', 'Present Today', 'Period Present Days',
          'Period Absent Days', 'Attendance Score', 'Driver Cases', 'Nurse Cases', 'Dispatch Cases',
          'Period Driver Completions', 'Email',
        ],
        rows: employees.map((e) => {
          const score = scoreByEmployeeId[e.id];
          return [
            this.employeeDisplayName(e),
            e.employeeRole?.name ?? 'Unassigned',
            e.department?.name ?? '—',
            e.station?.name ?? '—',
            presentTodayIds.has(e.id) ? 'Yes' : 'No',
            score?.presentDays ?? 0,
            score?.absentDays ?? 0,
            score ? `${score.attendancePercentage}%` : '—',
            e._count.drivenRequests,
            e._count.nurseRequests,
            e._count.dispatchedRequests,
            driverCompletedMap[e.id] ?? 0,
            e.user?.email ?? e.user?.username ?? '—',
          ];
        }),
      },
      secondaryTable: {
        title: `Today's Attendance by Role (${todayPresence.date})`,
        columns: ['Role', 'Total Staff', 'Present', 'Absent', 'Present Rate'],
        rows: [
          ['Drivers', byRole.drivers.total, byRole.drivers.present, byRole.drivers.absent,
            `${byRole.drivers.total ? this.percent(byRole.drivers.present, byRole.drivers.total) : 0}%`],
          ['Nurses', byRole.nurses.total, byRole.nurses.present, byRole.nurses.absent,
            `${byRole.nurses.total ? this.percent(byRole.nurses.present, byRole.nurses.total) : 0}%`],
          ['Dispatchers', byRole.dispatchers.total, byRole.dispatchers.present, byRole.dispatchers.absent,
            `${byRole.dispatchers.total ? this.percent(byRole.dispatchers.present, byRole.dispatchers.total) : 0}%`],
          ['Admins', byRole.admins.total, byRole.admins.present, byRole.admins.absent,
            `${byRole.admins.total ? this.percent(byRole.admins.present, byRole.admins.total) : 0}%`],
          ['Field staff (D+N+Disp)', fieldStaff.total, fieldStaff.present, fieldStaff.absent,
            `${fieldStaff.total ? fieldStaff.presentPercentage : 0}%`],
        ],
      },
    };
  }

  private normalizeHospitalKey(name?: string | null) {
    return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private async loadPeriodHandoverRecords(period: ReportPeriod, filters: AdminReportFilters) {
    const requestWhere = this.emergencyDimensionWhere(filters);
    return this.prisma.patientCareRecord.findMany({
      where: {
        createdAt: { gte: period.start, lte: period.end },
        clinicalNotes: { startsWith: '[EADS_HANDOVER]' },
        emergencyRequest: requestWhere,
      },
      include: {
        emergencyRequest: {
          include: {
            patient: true,
            region: true,
            district: true,
            driver: true,
            nurse: true,
            destinationHospital: true,
            incidentCategory: true,
          },
        },
        nurse: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private latestHandoverByCase<T extends { requestId: string | null }>(records: T[]) {
    const latestByCase = new Map<string, T>();
    for (const record of records) {
      if (!record.requestId || latestByCase.has(record.requestId)) continue;
      latestByCase.set(record.requestId, record);
    }
    return latestByCase;
  }

  private async getHospitalAcceptanceReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const hospitalWhere: any = {};
    if (filters.hospital) hospitalWhere.id = filters.hospital;
    if (filters.region) hospitalWhere.regionId = filters.region;
    if (filters.district) hospitalWhere.districtId = filters.district;

    const [hospitals, referrals, coordinationCases, handoverRecords, destinationCases] =
      await Promise.all([
        this.prisma.hospital.findMany({
          where: hospitalWhere,
          orderBy: { name: 'asc' },
          include: {
            region: true,
            district: true,
            referrals: { where: { createdAt: { gte: period.start, lte: period.end } } },
            requests: { where },
            coordinationCases: {
              where: {
                deletedAt: null,
                createdAt: { gte: period.start, lte: period.end },
                ...(filters.hospital ? { hospitalId: filters.hospital } : {}),
              },
            },
          },
        }),
        this.prisma.referral.findMany({
          where: {
            createdAt: { gte: period.start, lte: period.end },
            ...(filters.hospital ? { hospitalId: filters.hospital } : {}),
            emergencyRequest: this.emergencyDimensionWhere(filters),
          },
          select: { status: true, hospitalId: true, hospitalName: true },
        }),
        this.prisma.hospitalCoordinationCase.findMany({
          where: {
            deletedAt: null,
            createdAt: { gte: period.start, lte: period.end },
            ...(filters.hospital ? { hospitalId: filters.hospital } : {}),
            emergencyRequest: this.emergencyDimensionWhere(filters),
          },
          select: { hospitalId: true, stage: true, status: true },
        }),
        this.loadPeriodHandoverRecords(period, filters),
        this.prisma.emergencyRequest.count({
          where: { ...where, destinationHospitalId: { not: null } },
        }),
      ]);

    type HospitalStats = {
      referralAccepted: number;
      referralRejected: number;
      referralCompleted: number;
      referralTotal: number;
      coordAccepted: number;
      coordRejected: number;
      handoverAccepted: number;
      handoverRejected: number;
      destinationCases: number;
    };

    const byHospitalId = new Map<string, HospitalStats>();
    const byHospitalName = new Map<string, string>(); // normalized name -> hospital id
    for (const h of hospitals) {
      byHospitalId.set(h.id, {
        referralAccepted: 0,
        referralRejected: 0,
        referralCompleted: 0,
        referralTotal: 0,
        coordAccepted: 0,
        coordRejected: 0,
        handoverAccepted: 0,
        handoverRejected: 0,
        destinationCases: h.requests.length,
      });
      byHospitalName.set(this.normalizeHospitalKey(h.name), h.id);
    }

    const matchHospitalId = (name?: string | null, hospitalId?: string | null) => {
      if (hospitalId && byHospitalId.has(hospitalId)) return hospitalId;
      const key = this.normalizeHospitalKey(name);
      if (!key) return null;
      return byHospitalName.get(key) ?? null;
    };

    let referralAccepted = 0;
    let referralRejected = 0;
    let referralCompleted = 0;
    for (const r of referrals) {
      const id = matchHospitalId(r.hospitalName, r.hospitalId);
      if (r.status === 'ACCEPTED') referralAccepted += 1;
      else if (r.status === 'REJECTED') referralRejected += 1;
      else if (r.status === 'COMPLETED') referralCompleted += 1;
      if (!id) continue;
      const stats = byHospitalId.get(id)!;
      stats.referralTotal += 1;
      if (r.status === 'ACCEPTED') stats.referralAccepted += 1;
      else if (r.status === 'REJECTED') stats.referralRejected += 1;
      else if (r.status === 'COMPLETED') stats.referralCompleted += 1;
    }

    let coordAccepted = 0;
    let coordRejected = 0;
    for (const c of coordinationCases) {
      const accepted = c.stage === 'ACCEPTED' || c.status === 'ACCEPTED';
      const refused = c.stage === 'REFUSED' || c.status === 'REJECTED';
      if (accepted) coordAccepted += 1;
      if (refused) coordRejected += 1;
      const stats = byHospitalId.get(c.hospitalId);
      if (!stats) continue;
      if (accepted) stats.coordAccepted += 1;
      if (refused) stats.coordRejected += 1;
    }

    const latestHandovers = this.latestHandoverByCase(handoverRecords);
    const handoverEventRows: Array<Array<string | number>> = [];
    let nurseAccepted = 0;
    let nurseRejected = 0;
    const unmatchedAccepted: Record<string, number> = {};
    const unmatchedRejected: Record<string, number> = {};

    for (const record of latestHandovers.values()) {
      const parsed = this.parseHandoverOutcome(record.clinicalNotes);
      if (!parsed) continue;
      const req = record.emergencyRequest;
      const caseId = req?.trackingCode ?? '—';
      const patient = req?.patient?.fullName ?? req?.callerName ?? '—';

      const acceptedName =
        parsed.acceptedHospital ||
        req?.destinationHospital?.name ||
        req?.destination ||
        '';
      if (acceptedName.trim()) {
        nurseAccepted += 1;
        const hid = matchHospitalId(acceptedName, req?.destinationHospitalId);
        if (hid) byHospitalId.get(hid)!.handoverAccepted += 1;
        else {
          const key = acceptedName.trim();
          unmatchedAccepted[key] = (unmatchedAccepted[key] ?? 0) + 1;
        }
        handoverEventRows.push([
          caseId,
          patient,
          'Accepted',
          acceptedName.trim(),
          '—',
          this.formatHandoverOutcomeLabel(parsed.patientOutcome),
          req?.status ?? '—',
          record.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        ]);
      }

      for (const rejected of parsed.rejectedHospitals ?? []) {
        const name = rejected.hospitalName?.trim();
        if (!name) continue;
        nurseRejected += 1;
        const hid = matchHospitalId(name);
        if (hid) byHospitalId.get(hid)!.handoverRejected += 1;
        else unmatchedRejected[name] = (unmatchedRejected[name] ?? 0) + 1;
        handoverEventRows.push([
          caseId,
          patient,
          'Rejected',
          name,
          rejected.reason || '—',
          this.formatHandoverOutcomeLabel(parsed.patientOutcome),
          req?.status ?? '—',
          record.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        ]);
      }
    }

    const totalAccepted =
      referralAccepted + referralCompleted + coordAccepted + nurseAccepted;
    const totalRejected = referralRejected + coordRejected + nurseRejected;
    const totalDecisions = totalAccepted + totalRejected;

    return {
      title: 'Hospital Acceptance Reports',
      subtitle:
        'Hospital accept/reject from referrals, hospital coordination, destination assignment, and nurse handover (accepted & rejected hospitals).',
      period,
      summary: [
        { label: 'Referral Accepted', value: referralAccepted + referralCompleted },
        { label: 'Referral Rejected', value: referralRejected },
        { label: 'Coordination Accepted', value: coordAccepted },
        { label: 'Coordination Rejected', value: coordRejected },
        { label: 'Nurse Handover Accepted', value: nurseAccepted },
        { label: 'Nurse Handover Rejected', value: nurseRejected },
        { label: 'Destination Cases', value: destinationCases },
        {
          label: 'Overall Accept Rate',
          value: this.percent(totalAccepted, totalDecisions),
          suffix: '%',
        },
      ],
      table: {
        title: 'Hospital Performance Detail',
        columns: [
          'Hospital',
          'Status',
          'Region',
          'District',
          'Referral Acc.',
          'Referral Rej.',
          'Coord Acc.',
          'Coord Rej.',
          'Nurse Acc.',
          'Nurse Rej.',
          'Total Acc.',
          'Total Rej.',
          'Accept Rate',
          'Destination Cases',
          'Phone',
        ],
        rows: hospitals.map((h) => {
          const s = byHospitalId.get(h.id)!;
          const accepted =
            s.referralAccepted + s.referralCompleted + s.coordAccepted + s.handoverAccepted;
          const rejected = s.referralRejected + s.coordRejected + s.handoverRejected;
          return [
            h.name,
            h.status,
            h.region?.name ?? '—',
            h.district?.name ?? '—',
            s.referralAccepted + s.referralCompleted,
            s.referralRejected,
            s.coordAccepted,
            s.coordRejected,
            s.handoverAccepted,
            s.handoverRejected,
            accepted,
            rejected,
            accepted + rejected ? `${this.percent(accepted, accepted + rejected)}%` : '—',
            s.destinationCases,
            h.primaryPhone ?? h.contactNumber ?? h.emergencyHotline ?? '—',
          ];
        }),
      },
      secondaryTable: {
        title: 'Nurse Handover Hospital Events',
        columns: [
          'Case ID',
          'Patient',
          'Decision',
          'Hospital',
          'Refusal Reason',
          'Patient Status',
          'Case Status',
          'Handover Time',
        ],
        rows: handoverEventRows,
      },
      tertiaryTable: {
        title: 'Unmatched Nurse-Entered Hospital Names',
        columns: ['Hospital Name (free text)', 'Accepted Count', 'Rejected Count'],
        rows: [
          ...new Set([
            ...Object.keys(unmatchedAccepted),
            ...Object.keys(unmatchedRejected),
          ]),
        ]
          .sort()
          .map((name) => [
            name,
            unmatchedAccepted[name] ?? 0,
            unmatchedRejected[name] ?? 0,
          ]),
      },
    };
  }

  private computeCaseResponseMinutes(r: {
    responseMinutes?: number | null;
    createdAt?: Date | null;
    assignedAt?: Date | null;
    dispatchedAt?: Date | null;
    arrivedAtSceneAt?: Date | null;
    completedAt?: Date | null;
    cancelledAt?: Date | null;
    serviceMinutes?: number | null;
  }) {
    const response =
      r.responseMinutes ??
      this.minutesBetweenDates(
        r.createdAt,
        r.dispatchedAt ?? r.assignedAt ?? r.arrivedAtSceneAt,
      ) ??
      this.minutesBetweenDates(r.dispatchedAt ?? r.assignedAt ?? r.createdAt, r.arrivedAtSceneAt);

    const service =
      r.serviceMinutes ??
      this.minutesBetweenDates(r.createdAt, r.completedAt ?? r.cancelledAt);

    return { response, service };
  }

  private async getResponseTimeReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const cases = await this.prisma.emergencyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        region: true,
        district: true,
        ambulance: true,
        destinationHospital: true,
      },
    });

    const statusCounts: Record<string, number> = {};
    let responseSum = 0;
    let responseCount = 0;
    let serviceSum = 0;
    let serviceCount = 0;
    let pending = 0;
    let dispatched = 0;
    let inProgress = 0;
    let completed = 0;
    let cancelled = 0;

    const PENDING_STATUSES = new Set(['PENDING', 'REVIEWING']);
    const DISPATCHED_STATUSES = new Set(['ASSIGNED', 'DISPATCHED']);
    const IN_PROGRESS_STATUSES = new Set([
      'EN_ROUTE',
      'ARRIVED_SCENE',
      'PATIENT_STABILIZED',
      'TRANSPORTING',
      'ARRIVED_HOSPITAL',
    ]);

    const regionAgg: Record<
      string,
      { count: number; responseSum: number; responseCount: number; serviceSum: number; serviceCount: number }
    > = {};

    const rows = cases.map((r) => {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
      if (PENDING_STATUSES.has(r.status)) pending += 1;
      else if (DISPATCHED_STATUSES.has(r.status)) dispatched += 1;
      else if (IN_PROGRESS_STATUSES.has(r.status)) inProgress += 1;
      else if (r.status === 'COMPLETED') completed += 1;
      else if (r.status === 'CANCELLED') cancelled += 1;

      const { response, service } = this.computeCaseResponseMinutes(r);
      if (response != null) {
        responseSum += response;
        responseCount += 1;
      }
      if (service != null) {
        serviceSum += service;
        serviceCount += 1;
      }

      const regionName = r.region?.name ?? 'Unassigned';
      if (!regionAgg[regionName]) {
        regionAgg[regionName] = {
          count: 0,
          responseSum: 0,
          responseCount: 0,
          serviceSum: 0,
          serviceCount: 0,
        };
      }
      regionAgg[regionName].count += 1;
      if (response != null) {
        regionAgg[regionName].responseSum += response;
        regionAgg[regionName].responseCount += 1;
      }
      if (service != null) {
        regionAgg[regionName].serviceSum += service;
        regionAgg[regionName].serviceCount += 1;
      }

      return [
        r.trackingCode,
        r.patient?.fullName ?? 'Unknown',
        r.priority,
        r.status,
        r.region?.name ?? '—',
        r.district?.name ?? '—',
        response ?? '—',
        service ?? '—',
        r.ambulance?.ambulanceNumber ?? '—',
        r.destinationHospital?.name ?? r.destination ?? '—',
        r.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        r.dispatchedAt
          ? r.dispatchedAt.toISOString().slice(0, 16).replace('T', ' ')
          : r.assignedAt
            ? r.assignedAt.toISOString().slice(0, 16).replace('T', ' ')
            : '—',
        r.completedAt
          ? r.completedAt.toISOString().slice(0, 16).replace('T', ' ')
          : '—',
      ];
    });

    return {
      title: 'Response Time Analysis',
      subtitle:
        'All cases in period — pending, dispatched, in progress, and completed — with response/service times computed from timestamps when needed.',
      period,
      summary: [
        {
          label: 'Avg Response',
          value: responseCount ? Math.round(responseSum / responseCount) : 0,
          suffix: ' min',
        },
        {
          label: 'Avg Service Time',
          value: serviceCount ? Math.round(serviceSum / serviceCount) : 0,
          suffix: ' min',
        },
        { label: 'Total Cases', value: cases.length },
        { label: 'Pending', value: pending },
        { label: 'Dispatched / Assigned', value: dispatched },
        { label: 'In Progress', value: inProgress },
        { label: 'Completed', value: completed },
        { label: 'Cancelled', value: cancelled },
        { label: 'Measured Response', value: responseCount },
      ],
      table: {
        title: 'Case Response Time Detail',
        columns: [
          'Tracking Code',
          'Patient',
          'Priority',
          'Status',
          'Region',
          'District',
          'Response (min)',
          'Service (min)',
          'Ambulance',
          'Destination',
          'Created',
          'Dispatched',
          'Completed',
        ],
        rows,
      },
      secondaryTable: {
        title: 'Status Breakdown',
        columns: ['Status', 'Cases'],
        rows: Object.entries(statusCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([status, count]) => [status, count]),
      },
      tertiaryTable: {
        title: 'Regional Response Summary',
        columns: ['Region', 'Cases', 'Measured', 'Avg Response', 'Avg Service'],
        rows: Object.entries(regionAgg)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([region, stats]) => [
            region,
            stats.count,
            stats.responseCount,
            stats.responseCount
              ? `${Math.round(stats.responseSum / stats.responseCount)} min`
              : '—',
            stats.serviceCount
              ? `${Math.round(stats.serviceSum / stats.serviceCount)} min`
              : '—',
          ]),
      },
    };
  }

  private async countDeceasedHandovers(period: ReportPeriod, filters: AdminReportFilters) {
    const requestWhere = this.emergencyDimensionWhere(filters);
    const records = await this.prisma.patientCareRecord.findMany({
      where: {
        createdAt: { gte: period.start, lte: period.end },
        clinicalNotes: { startsWith: '[EADS_HANDOVER]' },
        emergencyRequest: requestWhere,
      },
      select: { requestId: true, clinicalNotes: true },
      orderBy: { createdAt: 'desc' },
    });
    const latestByCase = new Map<string, string | null>();
    for (const record of records) {
      if (!record.requestId || latestByCase.has(record.requestId)) continue;
      latestByCase.set(record.requestId, record.clinicalNotes);
    }
    let deceased = 0;
    for (const notes of latestByCase.values()) {
      if (this.parseHandoverOutcome(notes)?.patientOutcome === 'Deceased') deceased += 1;
    }
    return { total: latestByCase.size, deceased };
  }

  private isFuneralTransportLabel(label: string | null | undefined) {
    if (!label) return false;
    const normalized = label.toLowerCase();
    return normalized.includes('funeral') || normalized.includes('deceased person');
  }

  private formatHandoverOutcomeLabel(outcome: 'Live' | 'Deceased' | 'Unknown') {
    if (outcome === 'Deceased') return 'Dead';
    if (outcome === 'Live') return 'Live';
    return 'Unknown';
  }

  private parseHandoverOutcome(clinicalNotes?: string | null) {
    const prefix = '[EADS_HANDOVER]';
    if (!clinicalNotes?.startsWith(prefix)) return null;
    try {
      const data = JSON.parse(clinicalNotes.slice(prefix.length)) as {
        patientOutcome?: string;
        patientCondition?: string;
        treatmentGiven?: string;
        receivingStaff?: string;
        acceptedHospital?: string;
        signature?: string;
        notes?: string;
        rejectedHospitals?: Array<{
          id?: string;
          hospitalName?: string;
          reason?: string;
          notes?: string;
        }>;
      };
      const outcome =
        data.patientOutcome === 'Deceased'
          ? 'Deceased'
          : data.patientOutcome === 'Live'
            ? 'Live'
            : 'Unknown';
      return { ...data, patientOutcome: outcome as 'Live' | 'Deceased' | 'Unknown' };
    } catch {
      return null;
    }
  }

  private formatRejectedHospitals(
    rejected?: Array<{ hospitalName?: string; reason?: string; notes?: string }> | null,
  ) {
    if (!rejected?.length) return '';
    return rejected
      .filter((r) => r.hospitalName?.trim())
      .map((r) => {
        const parts = [r.hospitalName!.trim()];
        if (r.reason?.trim()) parts.push(`(${r.reason.trim()})`);
        if (r.notes?.trim()) parts.push(`— ${r.notes.trim()}`);
        return parts.join(' ');
      })
      .join('; ');
  }

  private async getHandoverOutcomeReport(period: ReportPeriod, filters: AdminReportFilters) {
    const caseWhere = this.reportWhere(period, filters);

    const [handoverRecords, periodCases] = await Promise.all([
      this.loadPeriodHandoverRecords(period, filters),
      this.prisma.emergencyRequest.findMany({
        where: caseWhere,
        select: {
          id: true,
          notes: true,
          trackingCode: true,
          status: true,
          priority: true,
          destination: true,
          patient: { select: { fullName: true } },
          callerName: true,
          region: { select: { name: true } },
          district: { select: { name: true } },
          destinationHospital: { select: { name: true } },
          driver: { select: { firstName: true, lastName: true } },
          nurse: { select: { firstName: true, lastName: true } },
          patientCareRecords: {
            where: { clinicalNotes: { startsWith: '[EADS_HANDOVER]' } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { clinicalNotes: true, createdAt: true },
          },
        },
      }),
    ]);

    const caseTransport = new Map<string, string>();
    const transportCaseCounts: Record<string, number> = {};
    let funeralCaseCount = 0;
    let otherTransportCaseCount = 0;
    let awaitingHandover = 0;
    let completedWithoutHandover = 0;

    for (const c of periodCases) {
      const transport = this.parseNoteField(c.notes, 'Transport Type') || 'Not specified';
      caseTransport.set(c.id, transport);
      transportCaseCounts[transport] = (transportCaseCounts[transport] ?? 0) + 1;
      if (this.isFuneralTransportLabel(transport)) funeralCaseCount += 1;
      else otherTransportCaseCount += 1;

      const hasHandover = (c.patientCareRecords?.length ?? 0) > 0;
      if (!hasHandover) {
        if (c.status === 'COMPLETED') completedWithoutHandover += 1;
        else if (!['CANCELLED', 'PENDING', 'REVIEWING'].includes(c.status)) awaitingHandover += 1;
      }
    }

    // Prefer handovers linked to period cases; also keep handovers created in period
    // even if the case itself was created earlier.
    const latestByCase = this.latestHandoverByCase(handoverRecords);
    for (const c of periodCases) {
      if (latestByCase.has(c.id)) continue;
      const care = c.patientCareRecords?.[0];
      if (!care) continue;
      latestByCase.set(c.id, {
        id: `case-${c.id}`,
        requestId: c.id,
        clinicalNotes: care.clinicalNotes,
        createdAt: care.createdAt,
        nurse: null,
        emergencyRequest: {
          id: c.id,
          trackingCode: c.trackingCode,
          notes: c.notes,
          status: c.status,
          priority: c.priority,
          destination: c.destination,
          callerName: c.callerName,
          patient: c.patient,
          region: c.region,
          district: c.district,
          destinationHospital: c.destinationHospital,
          driver: c.driver,
          nurse: c.nurse,
          incidentCategory: null,
        },
      } as any);
    }

    let live = 0;
    let deceased = 0;
    let unknown = 0;
    let funeralDead = 0;
    let nonFuneralDead = 0;
    const rows: Array<Array<string | number>> = [];
    const transportHandoverStats: Record<
      string,
      { handovers: number; live: number; dead: number; unknown: number }
    > = {};

    for (const record of latestByCase.values()) {
      const parsed = this.parseHandoverOutcome(record.clinicalNotes);
      const outcome = parsed?.patientOutcome ?? 'Unknown';
      const req = record.emergencyRequest;
      const transport =
        (req?.id ? caseTransport.get(req.id) : null) ||
        this.parseNoteField(req?.notes, 'Transport Type') ||
        'Not specified';

      if (!transportHandoverStats[transport]) {
        transportHandoverStats[transport] = { handovers: 0, live: 0, dead: 0, unknown: 0 };
      }
      transportHandoverStats[transport].handovers += 1;
      if (outcome === 'Live') transportHandoverStats[transport].live += 1;
      else if (outcome === 'Deceased') transportHandoverStats[transport].dead += 1;
      else transportHandoverStats[transport].unknown += 1;

      if (filters.transportType) {
        const needle = filters.transportType.toLowerCase();
        if (!transport.toLowerCase().includes(needle)) continue;
      }
      if (filters.patientOutcome && filters.patientOutcome !== outcome) continue;
      if (filters.status && req?.status && filters.status !== req.status) continue;

      if (outcome === 'Live') live += 1;
      else if (outcome === 'Deceased') {
        deceased += 1;
        if (this.isFuneralTransportLabel(transport)) funeralDead += 1;
        else nonFuneralDead += 1;
      } else unknown += 1;

      const driverName = req?.driver
        ? `${req.driver.firstName ?? ''} ${req.driver.lastName ?? ''}`.trim()
        : '—';
      const nurseName = record.nurse
        ? `${record.nurse.firstName ?? ''} ${record.nurse.lastName ?? ''}`.trim()
        : req?.nurse
          ? `${req.nurse.firstName ?? ''} ${req.nurse.lastName ?? ''}`.trim()
          : '—';
      const destination =
        parsed?.acceptedHospital ||
        req?.destinationHospital?.name ||
        req?.destination ||
        '—';
      const rejected = this.formatRejectedHospitals(parsed?.rejectedHospitals) || '—';

      rows.push([
        req?.trackingCode ?? '—',
        req?.patient?.fullName ?? req?.callerName ?? '—',
        transport,
        req?.priority ?? '—',
        req?.status ?? '—',
        this.formatHandoverOutcomeLabel(outcome),
        destination,
        rejected,
        parsed?.receivingStaff || '—',
        nurseName,
        driverName,
        req?.region?.name ?? '—',
        req?.district?.name ?? '—',
        parsed?.patientCondition?.slice(0, 80) || '—',
        parsed?.treatmentGiven?.slice(0, 80) || '—',
        record.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      ]);
    }

    const total = live + deceased + unknown;

    const byRegion: Record<string, { live: number; dead: number; unknown: number }> = {};
    for (const record of latestByCase.values()) {
      const parsed = this.parseHandoverOutcome(record.clinicalNotes);
      const outcome = parsed?.patientOutcome ?? 'Unknown';
      const region = record.emergencyRequest?.region?.name ?? 'Unknown';
      if (!byRegion[region]) byRegion[region] = { live: 0, dead: 0, unknown: 0 };
      if (outcome === 'Live') byRegion[region].live += 1;
      else if (outcome === 'Deceased') byRegion[region].dead += 1;
      else byRegion[region].unknown += 1;
    }

    const transportNames = new Set([
      ...Object.keys(transportCaseCounts),
      ...Object.keys(transportHandoverStats),
    ]);

    return {
      title: 'Handover & Transfer Outcomes',
      subtitle:
        'Nurse handover Live/Dead status, accepted & rejected hospitals, transport type, and cases still awaiting handover.',
      period,
      summary: [
        { label: 'Total Cases (period)', value: periodCases.length },
        { label: 'Funeral Transports', value: funeralCaseCount },
        { label: 'Other Transport Types', value: otherTransportCaseCount },
        { label: 'Total Handovers', value: total },
        { label: 'Live at Handover', value: live },
        { label: 'Dead During Transfer', value: deceased },
        { label: 'Dead — Funeral Transport', value: funeralDead },
        { label: 'Dead — Other Transport', value: nonFuneralDead },
        { label: 'Awaiting Handover', value: awaitingHandover },
        { label: 'Completed w/o Handover', value: completedWithoutHandover },
        { label: 'Dead Rate', value: this.percent(deceased, total), suffix: '%' },
        { label: 'Outcome Not Recorded', value: unknown },
      ],
      table: {
        title: 'Handover Records',
        columns: [
          'Case ID',
          'Patient',
          'Transport Type',
          'Priority',
          'Case Status',
          'Handover Status',
          'Accepted Hospital',
          'Rejected Hospitals',
          'Receiving Doctor',
          'Nurse',
          'Driver',
          'Region',
          'District',
          'Condition Summary',
          'Treatment',
          'Handover Time',
        ],
        rows,
      },
      secondaryTable: {
        title: 'Transport Types — Cases & Handover Outcomes',
        columns: ['Transport Type', 'Total Cases', 'Handovers', 'Live', 'Dead', 'Unknown', 'Dead Rate'],
        rows: [...transportNames]
          .sort(
            (a, b) =>
              (transportCaseCounts[b] ?? 0) - (transportCaseCounts[a] ?? 0),
          )
          .map((transport) => {
            const stats = transportHandoverStats[transport] ?? {
              handovers: 0,
              live: 0,
              dead: 0,
              unknown: 0,
            };
            const cases = transportCaseCounts[transport] ?? 0;
            const handoverTotal = stats.live + stats.dead + stats.unknown;
            return [
              transport,
              cases,
              stats.handovers,
              stats.live,
              stats.dead,
              stats.unknown,
              handoverTotal ? `${this.percent(stats.dead, handoverTotal)}%` : '—',
            ];
          }),
      },
      tertiaryTable: {
        title: 'Handover Outcomes by Region',
        columns: ['Region', 'Live', 'Dead', 'Unknown', 'Total', 'Dead Rate'],
        rows: Object.entries(byRegion)
          .sort((a, b) => b[1].dead - a[1].dead)
          .map(([region, counts]) => {
            const regionTotal = counts.live + counts.dead + counts.unknown;
            return [
              region,
              counts.live,
              counts.dead,
              counts.unknown,
              regionTotal,
              `${this.percent(counts.dead, regionTotal)}%`,
            ];
          }),
      },
    };
  }

  private async getCaseOutcomeReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const handoverDeceased = await this.countDeceasedHandovers(period, filters);

    const [cases, careRecords, incidents] = await Promise.all([
      this.prisma.emergencyRequest.findMany({
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
          patientCareRecords: {
            where: { clinicalNotes: { startsWith: '[EADS_HANDOVER]' } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { clinicalNotes: true, createdAt: true },
          },
        },
      }),
      this.prisma.patientCareRecord.count({
        where: { createdAt: { gte: period.start, lte: period.end } },
      }),
      this.prisma.incidentReport.count({
        where: { createdAt: { gte: period.start, lte: period.end } },
      }),
    ]);

    let completed = 0;
    let cancelled = 0;
    let pending = 0;
    let dispatched = 0;
    let inProgress = 0;
    let live = 0;
    let dead = 0;
    let withHandover = 0;

    const rows = cases.map((r) => {
      if (r.status === 'COMPLETED') completed += 1;
      else if (r.status === 'CANCELLED') cancelled += 1;
      else if (['PENDING', 'REVIEWING'].includes(r.status)) pending += 1;
      else if (['ASSIGNED', 'DISPATCHED'].includes(r.status)) dispatched += 1;
      else inProgress += 1;

      const handover = this.parseHandoverOutcome(r.patientCareRecords?.[0]?.clinicalNotes);
      if (handover) {
        withHandover += 1;
        if (handover.patientOutcome === 'Live') live += 1;
        else if (handover.patientOutcome === 'Deceased') dead += 1;
      }

      const destination =
        handover?.acceptedHospital ||
        r.destinationHospital?.name ||
        r.destination ||
        '—';
      const rejected = this.formatRejectedHospitals(handover?.rejectedHospitals) || '—';
      const { response } = this.computeCaseResponseMinutes(r);

      return [
        r.trackingCode,
        r.patient?.fullName ?? 'Unknown',
        r.priority,
        r.status,
        handover ? this.formatHandoverOutcomeLabel(handover.patientOutcome) : '—',
        destination,
        rejected,
        r.region?.name ?? '—',
        r.district?.name ?? '—',
        r.incidentCategory?.name ?? '—',
        r.pickupLocation,
        r.ambulance?.ambulanceNumber ?? '—',
        r.driver ? this.employeeDisplayName(r.driver) : '—',
        r.nurse ? this.employeeDisplayName(r.nurse) : '—',
        response ?? '—',
        r.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        r.completedAt ? r.completedAt.toISOString().slice(0, 16).replace('T', ' ') : '—',
      ];
    });

    return {
      title: 'Case Outcome Reports',
      subtitle:
        'All cases in period with status, nurse handover Live/Dead outcome, accepted hospital, and rejected hospitals.',
      period,
      summary: [
        { label: 'Total Cases', value: cases.length },
        { label: 'Pending', value: pending },
        { label: 'Dispatched / Assigned', value: dispatched },
        { label: 'In Progress', value: inProgress },
        { label: 'Completed', value: completed },
        { label: 'Cancelled', value: cancelled },
        { label: 'Completion Rate', value: this.percent(completed, cases.length), suffix: '%' },
        { label: 'Handovers Recorded', value: withHandover || handoverDeceased.total },
        { label: 'Live at Handover', value: live },
        { label: 'Dead at Handover', value: dead || handoverDeceased.deceased },
        { label: 'Care Records', value: careRecords },
        { label: 'Incident Reports', value: incidents },
      ],
      table: {
        title: 'All Case Outcomes',
        columns: [
          'Tracking Code',
          'Patient',
          'Priority',
          'Status',
          'Handover Status',
          'Accepted Hospital',
          'Rejected Hospitals',
          'Region',
          'District',
          'Category',
          'Pickup',
          'Ambulance',
          'Driver',
          'Nurse',
          'Response (min)',
          'Created',
          'Completed',
        ],
        rows,
      },
    };
  }

  private async getOperationsIntelligenceReport(period: ReportPeriod, filters: AdminReportFilters) {
    const where = this.reportWhere(period, filters);
    const [cases, trend, fleetStatus, referrals, todayPresence] = await Promise.all([
      this.prisma.emergencyRequest.findMany({
        where,
        include: {
          patient: true,
          region: true,
          district: true,
          station: true,
          ambulance: true,
          driver: true,
          nurse: true,
          dispatcher: true,
          destinationHospital: true,
          incidentCategory: true,
          patientCareRecords: { select: { id: true, clinicalNotes: true } },
        },
      }),
      this.getDailyEmergencyTrend(period, {}, filters),
      this.prisma.ambulance.groupBy({ by: ['status'], where: { isActive: true }, _count: true }),
      this.prisma.referral.findMany({
        where: { createdAt: { gte: period.start, lte: period.end } },
        select: { status: true, hospitalName: true },
      }),
      this.attendance.getTodayStaffPresence(),
    ]);

    const countBy = <T extends string>(map: Record<string, number>, key: T | null | undefined, fallback = 'Unknown') => {
      const k = key && String(key).trim() ? String(key) : fallback;
      map[k] = (map[k] ?? 0) + 1;
    };

    const requestTypes: Record<string, number> = {};
    const priorities: Record<string, number> = {};
    const genders: Record<string, number> = {};
    const bloodTypes: Record<string, number> = {};
    const districts: Record<string, number> = {};
    const regions: Record<string, number> = {};
    const stations: Record<string, number> = {};
    const ambulances: Record<string, number> = {};
    const drivers: Record<string, number> = {};
    const nurses: Record<string, number> = {};
    const dispatchers: Record<string, number> = {};
    const hospitals: Record<string, number> = {};
    const emergencyTypes: Record<string, number> = {};
    const transportTypes: Record<string, number> = {};
    const cancelReasons: Record<string, number> = {};
    const responseBuckets: Record<string, number> = {
      '<5 min': 0,
      '5-10 min': 0,
      '10-15 min': 0,
      '15+ min': 0,
    };
    const hourBuckets: Record<string, number> = {};

    let emergencyCount = 0;
    let nonEmergencyCount = 0;
    let referralCount = 0;
    let completed = 0;
    let pending = 0;
    let cancelled = 0;
    let critical = 0;
    let handovers = 0;
    let responseSum = 0;
    let responseCount = 0;
    let dispatchSum = 0;
    let dispatchCount = 0;

    for (const c of cases) {
      const reqType = this.parseRequestType(c.notes, c.requestSource);
      countBy(requestTypes, reqType);
      if (reqType === 'Emergency') emergencyCount += 1;
      else if (reqType === 'Non-Emergency') nonEmergencyCount += 1;
      else if (reqType === 'Referral') referralCount += 1;

      countBy(priorities, c.priority);
      if (c.priority === 'CRITICAL') critical += 1;
      if (c.status === 'COMPLETED') completed += 1;
      else if (c.status === 'CANCELLED') cancelled += 1;
      else if (c.status === 'PENDING' || c.status === 'REVIEWING') pending += 1;

      countBy(genders, c.patient?.gender ?? 'UNKNOWN', 'Unknown');
      countBy(bloodTypes, c.patient?.bloodType ?? 'UNKNOWN', 'Unknown');
      countBy(districts, c.district?.name);
      countBy(regions, c.region?.name);
      countBy(stations, c.station?.name);
      if (c.ambulance?.ambulanceNumber) countBy(ambulances, c.ambulance.ambulanceNumber);
      if (c.driver) countBy(drivers, this.employeeDisplayName(c.driver));
      if (c.nurse) countBy(nurses, this.employeeDisplayName(c.nurse));
      if (c.dispatcher) countBy(dispatchers, this.employeeDisplayName(c.dispatcher));
      const hospitalName = c.destinationHospital?.name || c.destination;
      if (hospitalName) countBy(hospitals, hospitalName);

      const parsedEmergencyType = this.parseNoteField(c.notes, 'Emergency Type');
      const parsedTransport = this.parseNoteField(c.notes, 'Transport Type');
      if (parsedEmergencyType) countBy(emergencyTypes, parsedEmergencyType);
      else if (c.incidentCategory?.name) countBy(emergencyTypes, c.incidentCategory.name);
      if (parsedTransport) countBy(transportTypes, parsedTransport);

      if (c.cancellationReason) countBy(cancelReasons, c.cancellationReason);

      handovers += (c.patientCareRecords ?? []).filter((r) =>
        String(r.clinicalNotes ?? '').includes('[EADS_HANDOVER]'),
      ).length;

      const responseMin =
        c.responseMinutes ??
        this.minutesBetweenDates(
          c.dispatchedAt ?? c.assignedAt ?? c.createdAt,
          c.arrivedAtSceneAt,
        );
      if (responseMin != null) {
        responseSum += responseMin;
        responseCount += 1;
        if (responseMin < 5) responseBuckets['<5 min'] += 1;
        else if (responseMin <= 10) responseBuckets['5-10 min'] += 1;
        else if (responseMin <= 15) responseBuckets['10-15 min'] += 1;
        else responseBuckets['15+ min'] += 1;
      }

      const dispatchMin = this.minutesBetweenDates(c.createdAt, c.assignedAt ?? c.dispatchedAt);
      if (dispatchMin != null) {
        dispatchSum += dispatchMin;
        dispatchCount += 1;
      }

      const hour = new Date(c.createdAt).getHours();
      const hourLabel = `${String(hour).padStart(2, '0')}:00`;
      hourBuckets[hourLabel] = (hourBuckets[hourLabel] ?? 0) + 1;
    }

    const topEntries = (map: Record<string, number>, limit = 10) =>
      Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    const referralAccepted = referrals.filter((r) => ['ACCEPTED', 'COMPLETED'].includes(r.status)).length;
    const referralRejected = referrals.filter((r) => r.status === 'REJECTED').length;
    const referralPending = referrals.filter((r) => r.status === 'PENDING').length;

    const fleetMap = Object.fromEntries(fleetStatus.map((f) => [f.status, f._count]));
    const availableAmb = fleetMap.AVAILABLE ?? 0;
    const activeAmbMissions = cases.filter(
      (r) => !['COMPLETED', 'CANCELLED'].includes(r.status) && r.ambulanceId,
    ).length;
    const busyAmb = (fleetMap.ON_DUTY ?? 0) + activeAmbMissions;

    const topDistrict = topEntries(districts)[0];
    const topDriver = topEntries(drivers)[0];
    const topNurse = topEntries(nurses)[0];
    const topDispatcher = topEntries(dispatchers)[0];
    const topAmbulance = topEntries(ambulances)[0];
    const topStation = topEntries(stations)[0];
    const topHospital = topEntries(hospitals)[0];
    const topEmergencyType = topEntries(emergencyTypes)[0];
    const topTransportType = topEntries(transportTypes)[0];

    const peakHours = topEntries(hourBuckets, 5);
    const filterScope = await this.describeAppliedFilters(filters, period);

    return {
      title: 'Operations Intelligence',
      subtitle: filterScope.containsNote,
      filterScope,
      period,
      permissions: ['report.view', 'report.kpi', 'report.export', 'report.audit'],
      summary: [
        { label: 'Total Requests', value: cases.length },
        { label: 'Emergency Cases', value: emergencyCount },
        { label: 'Non-Emergency Cases', value: nonEmergencyCount },
        { label: 'Hospital Referrals', value: referralCount },
        { label: 'Completed Cases', value: completed },
        { label: 'Pending Cases', value: pending },
        { label: 'Cancelled Cases', value: cancelled },
        { label: 'Critical Cases', value: critical },
        { label: 'Male Patients', value: genders.MALE ?? 0 },
        { label: 'Female Patients', value: genders.FEMALE ?? 0 },
        { label: 'Unknown Gender', value: genders.Unknown ?? genders.UNKNOWN ?? 0 },
        { label: 'Patient Handovers', value: handovers },
        { label: 'Avg Response Time', value: responseCount ? Math.round(responseSum / responseCount) : 0, suffix: ' min' },
        { label: 'Avg Dispatch Time', value: dispatchCount ? Math.round(dispatchSum / dispatchCount) : 0, suffix: ' min' },
        { label: 'Case Completion Rate', value: this.percent(completed, cases.length), suffix: '%' },
        { label: 'Available Ambulances', value: availableAmb },
        { label: 'Busy Ambulances', value: busyAmb },
        { label: 'Referrals Accepted', value: referralAccepted },
        { label: 'Referrals Rejected', value: referralRejected },
        { label: 'Referrals Pending', value: referralPending },
        { label: 'Staff Available Today', value: todayPresence.presentEmployees },
        { label: 'Top Station', value: topStation ? topStation[0] : '—' },
        { label: 'Top Driver', value: topDriver ? topDriver[0] : '—' },
        { label: 'Top Nurse', value: topNurse ? topNurse[0] : '—' },
        { label: 'Top Dispatcher', value: topDispatcher ? topDispatcher[0] : '—' },
        { label: 'Top Ambulance', value: topAmbulance ? topAmbulance[0] : '—' },
        { label: 'Most Common Emergency', value: topEmergencyType ? topEmergencyType[0] : '—' },
        { label: 'Most Common Transport', value: topTransportType ? topTransportType[0] : '—' },
        { label: 'Most Requested District', value: topDistrict ? topDistrict[0] : '—' },
        { label: 'Most Selected Hospital', value: topHospital ? topHospital[0] : '—' },
      ],
      charts: [
        { title: 'Request Types', type: 'pie', data: this.mapCountChart(requestTypes) },
        { title: 'Patient Gender', type: 'pie', data: this.mapCountChart(genders) },
        { title: 'Priority Mix', type: 'pie', data: this.mapCountChart(priorities) },
        { title: 'Daily Requests', type: 'bar', data: trend.map((t) => ({ name: t.label, value: t.requests })) },
        { title: 'Response Time Buckets', type: 'bar', data: this.mapCountChart(responseBuckets) },
        { title: 'Peak Hours', type: 'bar', data: peakHours.map(([name, value]) => ({ name, value })) },
      ],
      sections: [
        {
          title: 'Top Districts by Requests',
          columns: ['District', 'Requests'],
          rows: topEntries(districts).map(([name, count]) => [name, count]),
        },
        {
          title: 'Top Regions',
          columns: ['Region', 'Requests'],
          rows: topEntries(regions).map(([name, count]) => [name, count]),
        },
        {
          title: 'Top Stations',
          columns: ['Station', 'Cases'],
          rows: topEntries(stations).map(([name, count]) => [name, count]),
        },
        {
          title: 'Top Ambulances',
          columns: ['Ambulance', 'Missions'],
          rows: topEntries(ambulances).map(([name, count]) => [name, count]),
        },
        {
          title: 'Top Drivers',
          columns: ['Driver', 'Cases'],
          rows: topEntries(drivers).map(([name, count]) => [name, count]),
        },
        {
          title: 'Top Nurses',
          columns: ['Nurse', 'Cases'],
          rows: topEntries(nurses).map(([name, count]) => [name, count]),
        },
        {
          title: 'Top Dispatchers',
          columns: ['Dispatcher', 'Cases Handled'],
          rows: topEntries(dispatchers).map(([name, count]) => [name, count]),
        },
        {
          title: 'Top Hospitals',
          columns: ['Hospital', 'Cases'],
          rows: topEntries(hospitals).map(([name, count]) => [name, count]),
        },
        {
          title: 'Emergency Types',
          columns: ['Type', 'Count'],
          rows: topEntries(emergencyTypes, 15).map(([name, count]) => [name, count]),
        },
        {
          title: 'Non-Emergency Transport Types',
          columns: ['Transport Type', 'Count'],
          rows: topEntries(transportTypes, 15).map(([name, count]) => [name, count]),
        },
        {
          title: 'Blood Groups',
          columns: ['Blood Group', 'Patients'],
          rows: topEntries(bloodTypes).map(([name, count]) => [name.replace(/_/g, ' '), count]),
        },
        {
          title: 'Cancellation Reasons',
          columns: ['Reason', 'Count'],
          rows: topEntries(cancelReasons).map(([name, count]) => [name, count]),
        },
      ],
      table: {
        title:
          filterScope.mode === 'filtered'
            ? 'Filtered Cases Overview'
            : 'Recent Cases Overview',
        columns: [
          'Tracking Code', 'Type', 'Patient', 'Gender', 'Priority', 'Status',
          'District', 'Station', 'Ambulance', 'Driver', 'Nurse', 'Response (min)', 'Total (min)', 'Created',
        ],
        rows: cases.slice(0, 100).map((c) => [
          c.trackingCode,
          this.parseRequestType(c.notes, c.requestSource),
          c.patient?.fullName ?? 'Unknown',
          c.patient?.gender ?? '—',
          c.priority,
          c.status,
          c.district?.name ?? '—',
          c.station?.name ?? '—',
          c.ambulance?.ambulanceNumber ?? '—',
          c.driver ? this.employeeDisplayName(c.driver) : '—',
          c.nurse ? this.employeeDisplayName(c.nurse) : '—',
          c.responseMinutes ??
            this.minutesBetweenDates(c.dispatchedAt ?? c.assignedAt ?? c.createdAt, c.arrivedAtSceneAt) ??
            '—',
          c.serviceMinutes ??
            this.minutesBetweenDates(c.createdAt, c.completedAt ?? c.cancelledAt) ??
            '—',
          c.createdAt.toISOString().slice(0, 16).replace('T', ' '),
        ]),
      },
    };
  }

  private mapCountChart(map: Record<string, number>) {
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }

  private parseRequestType(notes?: string | null, requestSource?: string | null) {
    if (notes?.includes('Request Type: Referral') || requestSource === 'REFERRAL') return 'Referral';
    if (notes?.includes('Request Type: Non-Emergency')) return 'Non-Emergency';
    if (notes?.includes('Request Type: Emergency')) return 'Emergency';
    return 'Emergency';
  }

  private parseNoteField(notes: string | null | undefined, field: string) {
    if (!notes) return null;
    const line = notes.split('\n').find((l) => l.startsWith(`${field}:`));
    if (!line) return null;
    return line.slice(field.length + 1).trim() || null;
  }

  private minutesBetweenDates(from?: Date | null, to?: Date | null) {
    if (!from || !to) return null;
    return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
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

  private async describeAppliedFilters(filters: AdminReportFilters, period: ReportPeriod) {
    const parts: string[] = [];

    if (filters.region) {
      const region = await this.prisma.region.findUnique({
        where: { id: filters.region },
        select: { name: true },
      });
      parts.push(`Region: ${region?.name ?? filters.region}`);
    }
    if (filters.district) {
      const district = await this.prisma.district.findUnique({
        where: { id: filters.district },
        select: { name: true },
      });
      parts.push(`District: ${district?.name ?? filters.district}`);
    }
    if (filters.priority) parts.push(`Priority: ${filters.priority}`);
    if (filters.status) parts.push(`Status: ${String(filters.status).replace(/_/g, ' ')}`);
    if (filters.emergencyType) {
      const category = await this.prisma.incidentCategory.findUnique({
        where: { id: filters.emergencyType },
        select: { name: true },
      });
      parts.push(`Emergency type: ${category?.name ?? filters.emergencyType}`);
    }
    if (filters.startDate || filters.endDate) {
      parts.push(`Custom dates: ${filters.startDate || '…'} to ${filters.endDate || '…'}`);
    } else {
      const rangeLabels: Record<string, string> = {
        '7d': 'Last 7 days',
        '30d': 'Last 30 days',
        '90d': 'Last 90 days',
        '365d': 'Last 12 months',
      };
      parts.push(`Period: ${rangeLabels[filters.range || '30d'] ?? period.label}`);
    }

    const filtered = Boolean(
      filters.region ||
        filters.district ||
        filters.priority ||
        filters.status ||
        filters.emergencyType ||
        filters.startDate ||
        filters.endDate,
    );

    return {
      mode: filtered ? ('filtered' as const) : ('full' as const),
      label: filtered
        ? 'Specific data according to applied filters'
        : 'All operations data for the selected period',
      description: parts.join(' · '),
      containsNote: filtered
        ? `This report contains specific data matching your filters (${parts.join(' · ')}). It is not a full "all emergencies" export.`
        : `This report contains all operations data for the selected time period (${parts.join(' · ')}). No region, district, or status filters were applied.`,
    };
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
