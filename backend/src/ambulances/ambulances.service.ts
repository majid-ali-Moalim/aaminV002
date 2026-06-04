import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
    // We use 'any' to allow incoming IDs for relations before DTOs are fully strictly typed
    const { regionId, districtId, stationId, equipmentLevelId, ...rest } = data;

    try {
      const result = await this.prisma.ambulance.create({
        data: {
          ...rest,
          region: regionId ? { connect: { id: regionId } } : undefined,
          district: districtId ? { connect: { id: districtId } } : undefined,
          station: stationId ? { connect: { id: stationId } } : undefined,
          equipmentLevel: equipmentLevelId ? { connect: { id: equipmentLevelId } } : undefined,
        },
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
    const { regionId, districtId, stationId, equipmentLevelId, ...rest } = data;

    try {
      const existing = await this.prisma.ambulance.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Ambulance not found');

      const result = await this.prisma.ambulance.update({
        where: { id },
        data: {
          ...rest,
          region: regionId ? { connect: { id: regionId } } : undefined,
          district: districtId ? { connect: { id: districtId } } : undefined,
          station: stationId ? { connect: { id: stationId } } : undefined,
          equipmentLevel: equipmentLevelId ? { connect: { id: equipmentLevelId } } : undefined,
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

    await this.notifications.create({
      title: 'Ambulance Status Update',
      message: `Ambulance ${result.ambulanceNumber} is now ${status}`,
      type: 'AMBULANCE' as any,
      priority: status === 'MAINTENANCE' ? 'HIGH' : 'MEDIUM',
      relatedModule: 'Ambulance',
      relatedId: result.id,
      actionUrl: `/admin/ambulances?id=${result.id}`,
    });

    return result;
  }

  async assignDriver(id: string, driverEmployeeId: string) {
    const updateEmployee = this.prisma.employee.update({
      where: { id: driverEmployeeId },
      data: {
        assignedAmbulanceId: id,
      },
      include: {
        user: true,
        assignedAmbulance: true,
      },
    });

    const updateAmbulance = this.prisma.ambulance.update({
      where: { id },
      data: {
        status: AmbulanceStatus.ON_DUTY,
      },
      include: {
        employees: {
          include: {
            user: true,
            employeeRole: true,
          },
        },
      },
    });

    const [employee, result] = await Promise.all([updateEmployee, updateAmbulance]);

    await this.notifications.create({
      title: 'Ambulance Crew Assigned',
      message: `Driver ${employee.user.username} has been assigned to Ambulance ${result.ambulanceNumber}`,
      type: 'AMBULANCE' as any,
      priority: 'MEDIUM',
      relatedModule: 'Ambulance',
      relatedId: result.id,
      actionUrl: `/admin/ambulances?id=${result.id}`,
    });

    return [employee, result];
  }

  async assignNurse(id: string, nurseEmployeeId: string) {
    const existing = await this.prisma.ambulance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ambulance not found');

    const employee = await this.prisma.employee.update({
      where: { id: nurseEmployeeId },
      data: { assignedAmbulanceId: id },
      include: {
        user: true,
        assignedAmbulance: true,
        employeeRole: true,
      },
    });

    await this.notifications.create({
      title: 'Nurse Assigned to Ambulance',
      message: `Nurse ${employee.user?.username || employee.firstName} assigned to Ambulance ${existing.ambulanceNumber}`,
      type: 'AMBULANCE' as any,
      priority: 'MEDIUM',
      relatedModule: 'Ambulance',
      relatedId: existing.id,
      actionUrl: `/admin/ambulances?id=${existing.id}`,
    });

    return employee;
  }

  delete(id: string) {
    return this.prisma.ambulance.delete({
      where: { id },
    });
  }
}
