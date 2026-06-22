import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async getPublicStats() {
    const responseWindowStart = new Date();
    responseWindowStart.setFullYear(responseWindowStart.getFullYear() - 1);

    const [
      emergencyCalls,
      ambulances,
      drivers,
      nurses,
      completedCases,
      responseRecords,
    ] = await Promise.all([
      this.prisma.emergencyRequest.count(),
      this.prisma.ambulance.count({ where: { isActive: true } }),
      this.prisma.employee.count({
        where: {
          status: 'ACTIVE',
          employeeRole: { name: { equals: 'Driver', mode: 'insensitive' } },
        },
      }),
      this.prisma.employee.count({
        where: {
          status: 'ACTIVE',
          employeeRole: { name: { equals: 'Nurse', mode: 'insensitive' } },
        },
      }),
      this.prisma.emergencyRequest.count({ where: { status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.findMany({
        where: {
          dispatchedAt: { not: null },
          createdAt: { gte: responseWindowStart },
        },
        select: { createdAt: true, dispatchedAt: true, responseMinutes: true },
      }),
    ]);

    const responseSamples = responseRecords
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

    const avgResponseTimeMinutes =
      responseSamples.length > 0
        ? Math.round(responseSamples.reduce((sum, v) => sum + v, 0) / responseSamples.length)
        : null;

    const medicalStaff = drivers + nurses;

    return {
      emergencyCalls,
      ambulances,
      medicalStaff,
      drivers,
      nurses,
      completedCases,
      avgResponseTimeMinutes,
      updatedAt: new Date().toISOString(),
    };
  }
}
