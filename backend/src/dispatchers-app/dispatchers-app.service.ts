import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
