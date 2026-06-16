import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { 
    stationId?: string; 
    status?: string; 
    shiftStatus?: string;
    searchTerm?: string;
  }) {
    const where: Prisma.EmployeeWhereInput = {
      employeeRole: {
        name: 'Driver',
      },
    };

    if (filters?.stationId) {
      where.stationId = filters.stationId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.shiftStatus) {
      where.shiftStatus = filters.shiftStatus;
    }

    if (filters?.searchTerm) {
      where.OR = [
        { firstName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { lastName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { employeeCode: { contains: filters.searchTerm, mode: 'insensitive' } },
        { phone: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      include: {
        user: true,
        employeeRole: true,
        department: true,
        station: true,
        assignedAmbulance: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
        employeeRole: true,
        department: true,
        station: true,
        assignedAmbulance: true,
        drivenRequests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: true,
            ambulance: true,
          }
        },
        shiftRecords: {
          take: 10,
          orderBy: { startTime: 'desc' },
        },
        attendanceRecords: {
          take: 10,
          orderBy: { date: 'desc' },
        }
      },
    });
  }

  async getStats() {
    const drivers = await this.prisma.employee.findMany({
      where: {
        employeeRole: { name: 'Driver' },
      },
    });

    const total = drivers.length;
    const available = drivers.filter(d => d.shiftStatus === 'AVAILABLE').length;
    const onDuty = drivers.filter(d => d.shiftStatus === 'ON_DUTY').length;
    const onBreak = drivers.filter(d => d.shiftStatus === 'ON_BREAK').length;
    const unavailable = drivers.filter(d => d.shiftStatus === 'UNAVAILABLE').length;
    
    // License expiring within 30 days
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const expiringLicenses = drivers.filter(d => 
      d.licenseExpiryDate && d.licenseExpiryDate <= nextMonth && d.licenseExpiryDate >= new Date()
    ).length;

    return {
      total,
      available,
      onDuty,
      onBreak,
      unavailable,
      expiringLicenses,
    };
  }

  async updateShiftStatus(id: string, status: string, notes?: string) {
    // End current active shift if any
    if (status !== 'OFF_DUTY') {
      await this.prisma.shiftRecord.updateMany({
        where: {
          employeeId: id,
          endTime: null,
        },
        data: {
          endTime: new Date(),
        },
      });

      // Start new shift record
      await this.prisma.shiftRecord.create({
        data: {
          employeeId: id,
          status,
          notes,
        },
      });
    } else {
        // Just end the active shift
        await this.prisma.shiftRecord.updateMany({
            where: {
                employeeId: id,
                endTime: null,
            },
            data: {
                endTime: new Date(),
            },
        });
    }

    return this.prisma.employee.update({
      where: { id },
      data: { shiftStatus: status },
    });
  }

  async assignAmbulance(id: string, ambulanceId: string | null) {
    return this.prisma.employee.update({
      where: { id },
      data: {
        assignedAmbulanceId: ambulanceId,
      },
    });
  }

  async getAttendance(filters?: { startDate?: string; endDate?: string }) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        date: {
          gte: filters?.startDate ? new Date(filters.startDate) : undefined,
          lte: filters?.endDate ? new Date(filters.endDate) : undefined,
        },
      },
      include: {
        employee: {
          include: {
            station: true,
            assignedAmbulance: true,
          }
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async checkIn(id: string, notes?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new Error('Employee not found');

    // Check if already checked in today
    const existing = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId: id,
        date: today,
      },
    });

    if (existing) {
      throw new Error('Already checked in today');
    }

    const checkInTime = new Date();
    let status = 'ON_TIME';
    
    // Logic: if after typicalStartTime, it's LATE
    if (employee.typicalStartTime) {
      const [hours, minutes] = employee.typicalStartTime.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours || 9, minutes || 0, 0, 0);
      
      // Add 15 min buffer
      scheduledTime.setMinutes(scheduledTime.getMinutes() + 15);

      if (checkInTime > scheduledTime) {
        status = 'LATE';
      }
    } else {
      const nineAM = new Date();
      nineAM.setHours(9, 15, 0, 0);
      if (checkInTime > nineAM) {
        status = 'LATE';
      }
    }

    return this.prisma.attendanceRecord.create({
      data: {
        employeeId: id,
        date: today,
        checkIn: checkInTime,
        status,
        notes,
      },
    });
  }

  async checkOut(id: string, notes?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId: id,
        date: today,
      },
    });

    if (!record) {
      throw new Error('No check-in record found for today');
    }

    return this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOut: new Date(),
        notes: notes ? `${record.notes || ''}\n${notes}` : record.notes,
      },
    });
  }

  async getPerformance() {
    const drivers = await this.prisma.employee.findMany({
      where: { employeeRole: { name: 'Driver' } },
      include: {
        drivenRequests: {
          where: { 
            status: 'COMPLETED',
            responseMinutes: { not: null }
          },
        },
      },
    });

    return drivers.map(d => {
      const completedMissions = d.drivenRequests.length;
      const totalResponseTime = d.drivenRequests.reduce((acc, req) => acc + (req.responseMinutes || 0), 0);
      const avgResponseTime = completedMissions > 0 ? Math.round(totalResponseTime / completedMissions) : 0;

      return {
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        totalMissions: completedMissions,
        avgResponseTime,
      };
    });
  }

  private readonly ACTIVE_CASE_STATUSES = [
    'ASSIGNED',
    'DISPATCHED',
    'EN_ROUTE',
    'ARRIVED_SCENE',
    'PATIENT_STABILIZED',
    'TRANSPORTING',
    'ARRIVED_HOSPITAL',
    'REVIEWING',
  ] as const;

  private resolveOperationalStatus(
    shiftStatus: string,
    employmentStatus: string,
    hasActiveCase: boolean,
  ): 'available' | 'unavailable' {
    if (
      employmentStatus === 'ACTIVE' &&
      shiftStatus === 'AVAILABLE' &&
      !hasActiveCase
    ) {
      return 'available';
    }
    return 'unavailable';
  }

  private getUnavailableReason(
    shiftStatus: string,
    employmentStatus: string,
    hasActiveCase: boolean,
  ): string | null {
    if (hasActiveCase) return 'On case';
    if (employmentStatus !== 'ACTIVE') return 'Inactive';
    switch (shiftStatus) {
      case 'ON_DUTY':
        return 'On duty';
      case 'ON_BREAK':
        return 'On break';
      case 'UNAVAILABLE':
        return 'Unavailable';
      case 'OFF_DUTY':
        return 'Off duty';
      default:
        return shiftStatus !== 'AVAILABLE' ? shiftStatus.replace(/_/g, ' ') : null;
    }
  }

  async getAvailabilityOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [drivers, activeCases, todayCases, monthCases, recentShifts] =
      await Promise.all([
        this.prisma.employee.findMany({
          where: { employeeRole: { name: { equals: 'Driver', mode: 'insensitive' } } },
          include: {
            user: { select: { username: true, email: true } },
            employeeRole: true,
            station: { include: { region: true, district: true } },
            assignedAmbulance: { select: { id: true, ambulanceNumber: true, plateNumber: true } },
            drivenRequests: {
              where: { status: { in: [...this.ACTIVE_CASE_STATUSES] } },
              select: {
                id: true,
                trackingCode: true,
                status: true,
                updatedAt: true,
                patient: { select: { fullName: true } },
              },
              take: 1,
              orderBy: { updatedAt: 'desc' },
            },
          },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        }),
        this.prisma.emergencyRequest.findMany({
          where: {
            driverId: { not: null },
            status: { in: [...this.ACTIVE_CASE_STATUSES] },
          },
          select: {
            id: true,
            trackingCode: true,
            driverId: true,
            status: true,
            updatedAt: true,
            patient: { select: { fullName: true } },
          },
        }),
        this.prisma.emergencyRequest.findMany({
          where: { createdAt: { gte: todayStart }, driverId: { not: null } },
          select: { driverId: true },
        }),
        this.prisma.emergencyRequest.findMany({
          where: { createdAt: { gte: monthAgo }, driverId: { not: null } },
          select: { driverId: true, createdAt: true },
        }),
        this.prisma.shiftRecord.findMany({
          where: {
            employee: { employeeRole: { name: { equals: 'Driver', mode: 'insensitive' } } },
            startTime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          take: 25,
          orderBy: { startTime: 'desc' },
          include: {
            employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          },
        }),
      ]);

    const activeCaseByDriver = new Map(activeCases.map((c) => [c.driverId!, c]));

    const rows = drivers.map((driver) => {
      const activeCase =
        driver.drivenRequests?.[0] ?? activeCaseByDriver.get(driver.id) ?? null;
      const operationalStatus = this.resolveOperationalStatus(
        driver.shiftStatus,
        driver.status,
        !!activeCase,
      );
      const unavailableReason =
        operationalStatus === 'unavailable'
          ? this.getUnavailableReason(driver.shiftStatus, driver.status, !!activeCase)
          : null;

      return {
        id: driver.id,
        employeeCode: driver.employeeCode,
        firstName: driver.firstName,
        lastName: driver.lastName,
        fullName: [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Unknown',
        phone: driver.phone,
        shiftStatus: driver.shiftStatus,
        employmentStatus: driver.status,
        operationalStatus,
        unavailableReason,
        assignedAmbulance: driver.assignedAmbulance
          ? {
              id: driver.assignedAmbulance.id,
              ambulanceNumber: driver.assignedAmbulance.ambulanceNumber,
              plateNumber: driver.assignedAmbulance.plateNumber,
            }
          : null,
        station: driver.station
          ? { id: driver.station.id, name: driver.station.name }
          : null,
        region: driver.station?.region
          ? { id: driver.station.region.id, name: driver.station.region.name }
          : null,
        district: driver.station?.district
          ? { id: driver.station.district.id, name: driver.station.district.name }
          : null,
        licenseStatus: driver.licenseStatus,
        licenseExpiryDate: driver.licenseExpiryDate?.toISOString() ?? null,
        currentCase: activeCase
          ? {
              id: activeCase.id,
              trackingCode: activeCase.trackingCode,
              status: activeCase.status,
              patientName: (activeCase as any).patient?.fullName ?? null,
            }
          : null,
        updatedAt: driver.updatedAt.toISOString(),
      };
    });

    const summary = {
      total: rows.length,
      available: rows.filter((r) => r.operationalStatus === 'available').length,
      unavailable: rows.filter((r) => r.operationalStatus === 'unavailable').length,
      activeToday: new Set(todayCases.map((c) => c.driverId).filter(Boolean)).size,
    };

    const statusCounts = {
      available: summary.available,
      unavailable: summary.unavailable,
    };

    const recentChanges = recentShifts.map((shift) => ({
      id: shift.id,
      activity: `${[shift.employee.firstName, shift.employee.lastName].filter(Boolean).join(' ') || shift.employee.employeeCode || 'Driver'} — ${shift.status.replace(/_/g, ' ')}`,
      actorName: 'System',
      createdAt: shift.startTime.toISOString(),
      driverId: shift.employeeId,
    }));

    const dailyUsageMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyUsageMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const c of monthCases) {
      const key = c.createdAt.toISOString().slice(0, 10);
      if (dailyUsageMap.has(key)) {
        dailyUsageMap.set(key, (dailyUsageMap.get(key) ?? 0) + 1);
      }
    }

    const casesPerDriverMap = new Map<string, number>();
    for (const c of monthCases) {
      if (!c.driverId) continue;
      casesPerDriverMap.set(c.driverId, (casesPerDriverMap.get(c.driverId) ?? 0) + 1);
    }

    const driverNameById = new Map(
      drivers.map((d) => [
        d.id,
        [d.firstName, d.lastName].filter(Boolean).join(' ') || d.employeeCode || d.id.slice(0, 8),
      ]),
    );

    const analytics = {
      dailyUsage: Array.from(dailyUsageMap.entries()).map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      })),
      casesPerDriver: Array.from(casesPerDriverMap.entries())
        .map(([id, count]) => ({
          driverName: driverNameById.get(id) ?? id.slice(0, 8),
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      statusDistribution: [
        { name: 'Available', value: statusCounts.available, color: '#10B981' },
        { name: 'Unavailable', value: statusCounts.unavailable, color: '#EF4444' },
      ],
      activityTrend: Array.from(dailyUsageMap.entries()).map(([date, active]) => ({
        date,
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        active,
      })),
    };

    const stations = [...new Map(rows.filter((r) => r.station).map((r) => [r.station!.id, r.station!])).values()];
    const regions = [...new Map(rows.filter((r) => r.region).map((r) => [r.region!.id, r.region!])).values()];
    const districts = [...new Map(rows.filter((r) => r.district).map((r) => [r.district!.id, r.district!])).values()];

    const liveBoard = {
      available: rows.filter((r) => r.operationalStatus === 'available'),
      unavailable: rows.filter((r) => r.operationalStatus === 'unavailable'),
      recentlyUpdated: [...rows]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8),
    };

    return {
      summary,
      statusCounts,
      drivers: rows,
      recentChanges,
      analytics,
      filters: { stations, regions, districts },
      liveBoard,
    };
  }

  async getAvailabilityDetail(id: string) {
    const driver = await this.prisma.employee.findFirst({
      where: {
        id,
        employeeRole: { name: { equals: 'Driver', mode: 'insensitive' } },
      },
      include: {
        user: { select: { username: true, email: true } },
        employeeRole: true,
        station: { include: { region: true, district: true } },
        assignedAmbulance: true,
        drivenRequests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            trackingCode: true,
            status: true,
            priority: true,
            createdAt: true,
            completedAt: true,
            patient: { select: { fullName: true } },
            ambulance: { select: { ambulanceNumber: true } },
          },
        },
        shiftRecords: {
          take: 15,
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!driver) throw new NotFoundException('Driver not found');

    const activeCase = driver.drivenRequests.find((r) =>
      this.ACTIVE_CASE_STATUSES.includes(r.status as any),
    );

    return {
      driver: {
        id: driver.id,
        employeeCode: driver.employeeCode,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        shiftStatus: driver.shiftStatus,
        employmentStatus: driver.status,
        operationalStatus: this.resolveOperationalStatus(
          driver.shiftStatus,
          driver.status,
          !!activeCase,
        ),
        unavailableReason: activeCase || driver.shiftStatus !== 'AVAILABLE' || driver.status !== 'ACTIVE'
          ? this.getUnavailableReason(driver.shiftStatus, driver.status, !!activeCase)
          : null,
        licenseNumber: driver.licenseNumber,
        licenseStatus: driver.licenseStatus,
        licenseExpiryDate: driver.licenseExpiryDate?.toISOString() ?? null,
        station: driver.station,
        region: driver.station?.region ?? null,
        district: driver.station?.district ?? null,
        updatedAt: driver.updatedAt.toISOString(),
      },
      assignedAmbulance: driver.assignedAmbulance,
      currentCase: activeCase ?? null,
      caseHistory: driver.drivenRequests,
      shiftHistory: driver.shiftRecords.map((s) => ({
        id: s.id,
        status: s.status,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime?.toISOString() ?? null,
        notes: s.notes,
      })),
    };
  }
}
