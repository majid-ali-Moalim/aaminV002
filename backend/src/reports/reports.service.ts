import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
