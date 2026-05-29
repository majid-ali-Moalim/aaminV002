import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DispatchersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    stationId?: string;
    status?: string;
    shiftStatus?: string;
    searchTerm?: string;
  }) {
    const where: Prisma.EmployeeWhereInput = {
      employeeRole: { name: 'Dispatcher' },
    };

    if (filters?.stationId) where.stationId = filters.stationId;
    if (filters?.status) where.status = filters.status;
    if (filters?.shiftStatus) where.shiftStatus = filters.shiftStatus;

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
        station: {
          include: { region: true, district: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const dispatchers = await this.prisma.employee.findMany({
      where: { employeeRole: { name: 'Dispatcher' } },
      select: { status: true, shiftStatus: true },
    });

    return {
      total: dispatchers.length,
      active: dispatchers.filter((d) => d.status === 'ACTIVE').length,
      onDuty: dispatchers.filter(
        (d) => d.shiftStatus === 'ON_DUTY' || d.shiftStatus === 'AVAILABLE',
      ).length,
      inactive: dispatchers.filter((d) => d.status === 'INACTIVE').length,
    };
  }
}
