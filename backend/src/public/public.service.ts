import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemSetupService } from '../system-setup/system-setup.service';

@Injectable()
export class PublicService {
  constructor(
    private prisma: PrismaService,
    private setupService: SystemSetupService,
  ) {}

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

  /** Active emergency types from Master Data → Emergency Configuration */
  getEmergencyTypes() {
    return this.setupService.getEmergencyTypes();
  }

  /** Fleet availability for public hire-ambulance form */
  async getFleetAvailability() {
    const activeStatuses = ['ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'];

    const busyAmbulanceIds = (
      await this.prisma.emergencyRequest.findMany({
        where: { status: { in: activeStatuses as any } },
        select: { ambulanceId: true },
      })
    )
      .map((r) => r.ambulanceId)
      .filter(Boolean) as string[];

    const [availableList, totalActive] = await Promise.all([
      this.prisma.ambulance.findMany({
        where: {
          isActive: true,
          status: 'AVAILABLE',
          id: { notIn: busyAmbulanceIds },
        },
        select: { id: true, ambulanceNumber: true, status: true },
      }),
      this.prisma.ambulance.count({ where: { isActive: true } }),
    ]);

    return {
      available: availableList.length,
      total: totalActive,
      canAcceptRequests: availableList.length > 0,
    };
  }
}
