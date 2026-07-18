import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AmbulanceStatus, Prisma, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AmbulancesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  findAll() {
    return this.prisma.ambulance.findMany({
      include: {
        employees: {
          include: {
            user: true,
            employeeRole: true,
          },
        },
        region: true,
        district: true,
        station: true,
        equipmentLevel: true,
        emergencyRequests: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.ambulance.findUnique({
      where: { id },
      include: {
        employees: {
          include: {
            user: true,
            employeeRole: true,
          },
        },
        region: true,
        district: true,
        station: true,
        equipmentLevel: true,
        emergencyRequests: true,
      },
    });
  }

  async create(data: any) {
    const normalized = this.normalizeCreateData(data);

    try {
      const result = await this.prisma.ambulance.create({
        data: normalized,
        include: {
          employees: {
            include: {
              user: true,
              employeeRole: true,
            },
          },
          region: true,
          district: true,
          station: true,
          equipmentLevel: true,
        },
      });
      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target?.[0] || 'field';
        const friendlyName = target.replace(/([A-Z])/g, ' $1').toLowerCase();
        throw new ConflictException(`An ambulance with this ${friendlyName} already exists.`);
      }
      throw error;
    }
  }

  async update(id: string, data: any) {
    try {
      const existing = await this.prisma.ambulance.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Ambulance not found');

      const normalized = this.normalizeUpdateData(data);

      const result = await this.prisma.ambulance.update({
        where: { id },
        data: normalized,
        include: {
          employees: {
            include: {
              user: true,
              employeeRole: true,
            },
          },
          region: true,
          district: true,
          station: true,
          equipmentLevel: true,
        },
      });

      if (result.status !== existing.status) {
        await this.notifications.create({
          title: 'Ambulance Status Changed',
          message: `Ambulance ${result.ambulanceNumber} status changed from ${existing.status} to ${result.status}`,
          type: 'AMBULANCE' as any,
          priority: result.status === 'UNAVAILABLE' ? 'HIGH' : 'MEDIUM',
          relatedModule: 'Ambulance',
          relatedId: result.id,
          actionUrl: `/admin/ambulances?id=${result.id}`,
        });
      }

      if (result.fuelLevel !== null && result.fuelLevel < 20) {
        await this.notifications.create({
          title: 'Ambulance Fuel Low',
          message: `Ambulance ${result.ambulanceNumber} fuel level is at ${result.fuelLevel}%`,
          type: 'MAINTENANCE',
          priority: 'HIGH',
          relatedModule: 'Ambulance',
          relatedId: result.id,
        });
      }

      return result;
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target?.[0] || 'field';
        const friendlyName = target.replace(/([A-Z])/g, ' $1').toLowerCase();
        throw new ConflictException(`An ambulance with this ${friendlyName} already exists.`);
      }
      if (error?.code === 'P2025') {
        throw new NotFoundException('Related record not found for this update.');
      }
      throw error;
    }
  }

  findByStatus(status: AmbulanceStatus) {
    return this.prisma.ambulance.findMany({
      where: { status },
      include: {
        employees: {
          include: {
            user: true,
            employeeRole: true,
          },
        },
        region: true,
        district: true,
        station: true,
        equipmentLevel: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: AmbulanceStatus) {
    const existing = await this.prisma.ambulance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ambulance not found');

    const result = await this.prisma.ambulance.update({
      where: { id },
      data: { status },
      include: {
        employees: {
          include: {
            user: true,
            employeeRole: true,
          },
        },
        region: true,
        district: true,
        station: true,
        equipmentLevel: true,
      },
    });

    if (existing.status !== status) {
      await this.notifications.create({
        title: 'Ambulance Status Update',
        message: `Ambulance ${result.ambulanceNumber} is now ${status}`,
        type: 'AMBULANCE' as any,
        priority: status === 'MAINTENANCE' || status === 'UNAVAILABLE' ? 'HIGH' : 'MEDIUM',
        relatedModule: 'Ambulance',
        relatedId: result.id,
        actionUrl: `/admin/ambulances/availability`,
      });
    }

    return result;
  }

  async assignDriver(id: string, driverEmployeeId: string) {
    void id;
    void driverEmployeeId;
    throw new ConflictException(
      'Drivers and nurses are assigned when dispatching a case. Use the Dispatch Assign Team form.',
    );
  }

  async assignNurse(id: string, nurseEmployeeId: string) {
    void id;
    void nurseEmployeeId;
    throw new ConflictException('Nurses are assigned to emergency cases, not directly to ambulances.');
  }

  delete(id: string) {
    return this.prisma.ambulance.delete({
      where: { id },
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
    dbStatus: AmbulanceStatus,
    hasActiveCase: boolean,
  ): 'available' | 'unavailable' | 'maintenance' {
    if (dbStatus === 'MAINTENANCE') return 'maintenance';
    if (hasActiveCase || dbStatus === 'ON_DUTY') return 'unavailable';
    if (dbStatus === 'UNAVAILABLE') return 'unavailable';
    return 'available';
  }

  private getUnavailableReason(
    dbStatus: AmbulanceStatus,
    hasActiveCase: boolean,
  ): string | null {
    if (hasActiveCase || dbStatus === 'ON_DUTY') return 'Assigned to active case';
    if (dbStatus === 'UNAVAILABLE') return 'Out of service';
    return null;
  }

  async getAvailabilityOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [ambulances, activeCases, todayCases, monthCases, recentNotifications] =
      await Promise.all([
        this.prisma.ambulance.findMany({
          include: {
            employees: { include: { user: true, employeeRole: true } },
            region: true,
            district: true,
            station: true,
            equipmentLevel: true,
            emergencyRequests: {
              where: { status: { in: [...this.ACTIVE_CASE_STATUSES] } },
              select: {
                id: true,
                trackingCode: true,
                status: true,
                updatedAt: true,
                patient: { select: { fullName: true } },
                driver: { select: { id: true, firstName: true, lastName: true } },
                nurse: { select: { id: true, firstName: true, lastName: true } },
              },
              take: 1,
              orderBy: { updatedAt: 'desc' },
            },
          },
          orderBy: { ambulanceNumber: 'asc' },
        }),
        this.prisma.emergencyRequest.findMany({
          where: {
            ambulanceId: { not: null },
            status: { in: [...this.ACTIVE_CASE_STATUSES] },
          },
          select: {
            id: true,
            trackingCode: true,
            ambulanceId: true,
            status: true,
            updatedAt: true,
            patient: { select: { fullName: true } },
          },
        }),
        this.prisma.emergencyRequest.findMany({
          where: { createdAt: { gte: todayStart }, ambulanceId: { not: null } },
          select: { ambulanceId: true },
        }),
        this.prisma.emergencyRequest.findMany({
          where: { createdAt: { gte: monthAgo }, ambulanceId: { not: null } },
          select: { ambulanceId: true, createdAt: true },
        }),
        this.prisma.notification.findMany({
          where: { relatedModule: 'Ambulance', createdAt: { gte: weekAgo } },
          take: 25,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: {
                username: true,
                employee: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
      ]);

    const activeCaseByAmbulance = new Map(
      activeCases.map((c) => [c.ambulanceId!, c]),
    );

    const rows = ambulances.map((amb) => {
      const activeCase =
        amb.emergencyRequests?.[0] ?? activeCaseByAmbulance.get(amb.id) ?? null;
      const missionDriver = (activeCase as any)?.driver ?? null;
      const missionNurse = (activeCase as any)?.nurse ?? null;
      const operationalStatus = this.resolveOperationalStatus(
        amb.status,
        !!activeCase,
      );
      const unavailableReason =
        operationalStatus === 'unavailable'
          ? this.getUnavailableReason(amb.status, !!activeCase)
          : null;

      return {
        id: amb.id,
        ambulanceNumber: amb.ambulanceNumber,
        plateNumber: amb.plateNumber,
        fleetNumber: amb.fleetNumber,
        vehicleType: amb.vehicleType ?? amb.equipmentLevel?.name ?? 'Standard',
        dbStatus: amb.status,
        operationalStatus,
        driver: missionDriver
          ? {
              id: missionDriver.id,
              name: [missionDriver.firstName, missionDriver.lastName].filter(Boolean).join(' '),
            }
          : null,
        nurse: missionNurse
          ? {
              id: missionNurse.id,
              name: [missionNurse.firstName, missionNurse.lastName].filter(Boolean).join(' '),
            }
          : null,
        currentCase: activeCase
          ? {
              id: activeCase.id,
              trackingCode: activeCase.trackingCode,
              status: activeCase.status,
              patientName: (activeCase as any).patient?.fullName ?? null,
            }
          : null,
        region: amb.region ? { id: amb.region.id, name: amb.region.name } : null,
        district: amb.district ? { id: amb.district.id, name: amb.district.name } : null,
        station: amb.station ? { id: amb.station.id, name: amb.station.name } : null,
        readinessScore: amb.readinessScore ?? 100,
        updatedAt: amb.updatedAt.toISOString(),
      };
    });

    const summary = {
      total: rows.length,
      available: rows.filter((r) => r.operationalStatus === 'available').length,
      unavailable: rows.filter((r) => r.operationalStatus === 'unavailable').length,
      maintenance: rows.filter((r) => r.operationalStatus === 'maintenance').length,
      activeToday: new Set(todayCases.map((c) => c.ambulanceId).filter(Boolean)).size,
    };

    const statusCounts = {
      available: summary.available,
      unavailable: summary.unavailable,
      maintenance: summary.maintenance,
    };

    const recentChanges = recentNotifications.map((n) => {
      const emp = n.createdBy?.employee;
      const actorName = emp
        ? [emp.firstName, emp.lastName].filter(Boolean).join(' ')
        : n.senderName ?? n.createdBy?.username ?? 'System';
      return {
        id: n.id,
        activity: n.message,
        title: n.title,
        actorName,
        createdAt: n.createdAt.toISOString(),
        ambulanceId: n.relatedId,
      };
    });

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

    const casesPerAmbulanceMap = new Map<string, number>();
    for (const c of monthCases) {
      if (!c.ambulanceId) continue;
      casesPerAmbulanceMap.set(
        c.ambulanceId,
        (casesPerAmbulanceMap.get(c.ambulanceId) ?? 0) + 1,
      );
    }

    const ambulanceNumberById = new Map(ambulances.map((a) => [a.id, a.ambulanceNumber]));

    const analytics = {
      dailyUsage: Array.from(dailyUsageMap.entries()).map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      })),
      casesPerAmbulance: Array.from(casesPerAmbulanceMap.entries())
        .map(([id, count]) => ({
          ambulanceNumber: ambulanceNumberById.get(id) ?? id.slice(0, 8),
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      statusDistribution: [
        { name: 'Available', value: statusCounts.available, color: '#10B981' },
        { name: 'Unavailable', value: statusCounts.unavailable, color: '#EF4444' },
        { name: 'Maintenance', value: statusCounts.maintenance, color: '#F59E0B' },
      ],
      activityTrend: Array.from(dailyUsageMap.entries()).map(([date, active]) => ({
        date,
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        active,
      })),
    };

    const regions = [...new Map(rows.filter((r) => r.region).map((r) => [r.region!.id, r.region!])).values()];
    const districts = [...new Map(rows.filter((r) => r.district).map((r) => [r.district!.id, r.district!])).values()];
    const ambulanceTypes = [...new Set(rows.map((r) => r.vehicleType).filter(Boolean))].sort();

    const liveBoard = {
      available: rows.filter((r) => r.operationalStatus === 'available'),
      unavailable: rows.filter((r) => r.operationalStatus === 'unavailable'),
      recentlyUpdated: [...rows]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8),
    };

    return { summary, statusCounts, ambulances: rows, recentChanges, analytics, filters: { regions, districts, ambulanceTypes }, liveBoard };
  }

  async getAvailabilityDetail(id: string) {
    const ambulance = await this.prisma.ambulance.findUnique({
      where: { id },
      include: {
        employees: { include: { user: true, employeeRole: true } },
        region: true,
        district: true,
        station: true,
        equipmentLevel: true,
        emergencyRequests: {
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
            driver: { select: { id: true, firstName: true, lastName: true } },
            nurse: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!ambulance) throw new NotFoundException('Ambulance not found');

    const activeCase = ambulance.emergencyRequests.find((r) =>
      this.ACTIVE_CASE_STATUSES.includes(r.status as any),
    );

    const missionDriver = activeCase?.driver ?? null;
    const missionNurse = activeCase?.nurse ?? null;

    const statusHistory = await this.prisma.notification.findMany({
      where: { relatedModule: 'Ambulance', relatedId: id },
      take: 15,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, message: true, createdAt: true, senderName: true },
    });

    return {
      ambulance: {
        id: ambulance.id,
        ambulanceNumber: ambulance.ambulanceNumber,
        plateNumber: ambulance.plateNumber,
        fleetNumber: ambulance.fleetNumber,
        vehicleType: ambulance.vehicleType,
        vehicleBrand: ambulance.vehicleBrand,
        vehicleModel: ambulance.vehicleModel,
        dbStatus: ambulance.status,
        operationalStatus: this.resolveOperationalStatus(
          ambulance.status,
          !!activeCase,
        ),
        region: ambulance.region,
        district: ambulance.district,
        station: ambulance.station,
        readinessScore: ambulance.readinessScore,
        fuelLevel: ambulance.fuelLevel,
        updatedAt: ambulance.updatedAt.toISOString(),
      },
      driver: missionDriver,
      nurse: missionNurse,
      currentCase: activeCase ?? null,
      caseHistory: ambulance.emergencyRequests,
      statusHistory,
    };
  }

  private parseDate(value: string): Date | undefined {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private normalizeCreateData(data: Record<string, unknown>): Prisma.AmbulanceCreateInput {
    const payload = this.normalizeUpdateData(data) as Prisma.AmbulanceCreateInput;
    if (!payload.ambulanceNumber || !payload.plateNumber) {
      throw new BadRequestException('Ambulance number and plate number are required.');
    }
    return payload;
  }

  private normalizeUpdateData(data: Record<string, unknown>): Prisma.AmbulanceUpdateInput {
    const raw: Record<string, unknown> = { ...data };
    const payload: Prisma.AmbulanceUpdateInput = {};

    const scalarFields = [
      'ambulanceNumber',
      'plateNumber',
      'fleetNumber',
      'status',
      'location',
      'vehicleBrand',
      'vehicleModel',
      'vehicleType',
      'vehicleYear',
      'crewCount',
      'readinessScore',
      'oxygenAvailable',
      'defibrillatorAvailable',
      'registrationDocumentUrl',
      'isActive',
      'fuelLevel',
      'mileage',
      'notes',
    ] as const;

    for (const field of scalarFields) {
      if (!(field in raw)) continue;
      const value = raw[field];
      if (value === undefined) continue;
      if (value === '' || value === null) {
        if (field === 'oxygenAvailable' || field === 'defibrillatorAvailable' || field === 'isActive') {
          continue;
        }
        (payload as Record<string, unknown>)[field] = null;
        continue;
      }
      if (field === 'vehicleYear' || field === 'crewCount' || field === 'readinessScore' || field === 'fuelLevel' || field === 'mileage') {
        const num = Number(value);
        if (!Number.isNaN(num)) {
          (payload as Record<string, unknown>)[field] = num;
        }
        continue;
      }
      (payload as Record<string, unknown>)[field] = value;
    }

    const dateFields = ['registrationExpiry', 'lastMaintenance', 'nextMaintenance'] as const;
    for (const field of dateFields) {
      if (!(field in raw)) continue;
      const value = raw[field];
      if (value === null || value === '') {
        (payload as Record<string, unknown>)[field] = null;
      } else if (typeof value === 'string') {
        (payload as Record<string, unknown>)[field] = this.parseDate(value) ?? null;
      }
    }

    const relationMap = {
      regionId: 'region',
      districtId: 'district',
      stationId: 'station',
      equipmentLevelId: 'equipmentLevel',
    } as const;

    for (const [idField, relation] of Object.entries(relationMap)) {
      if (!(idField in raw)) continue;
      const value = raw[idField];
      if (value === null || value === '') {
        (payload as Record<string, unknown>)[relation] = { disconnect: true };
      } else if (typeof value === 'string') {
        (payload as Record<string, unknown>)[relation] = { connect: { id: value } };
      }
    }

    return payload;
  }
}
