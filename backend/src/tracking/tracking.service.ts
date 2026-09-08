import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EtaCalculationService } from './eta-calculation.service';

@Injectable()
export class TrackingService {
  constructor(
    private prisma: PrismaService,
    private etaService: EtaCalculationService
  ) {}

  // Securely fetch emergency case for public tracking
  async findByCodeOrPhone(query: string) {
    const request = await this.prisma.emergencyRequest.findFirst({
      where: {
        OR: [
          { trackingCode: query },
          { patient: { phone: query } },
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: { fullName: true, phone: true }
        },
        ambulance: {
          select: {
            ambulanceNumber: true,
            vehicleType: true,
            plateNumber: true,
            stationId: true,
            station: { select: { name: true } },
          },
        },
        // Public tracking never exposes crew identity or contact details —
        // only the station they respond from.
        driver: {
          select: {
            station: { select: { name: true } },
          },
        },
        nurse: {
          select: {
            station: { select: { name: true } },
          },
        },
        region: {
          select: { name: true }
        },
        district: {
          select: { name: true }
        },
        destinationHospital: {
          select: { name: true }
        },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            createdAt: true,
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundException('Tracking information not found');
    }

    const estimatedArrival = this.etaService.calculateEta({
      status: request.status,
      priority: request.priority,
      ambulanceId: request.ambulanceId
    } as any);

    const stationName =
      request.driver?.station?.name ||
      request.ambulance?.station?.name ||
      null;

    // Expose only operational data
    return {
      id: request.id,
      trackingCode: request.trackingCode,
      emergencyType: request.incidentCategoryId, 
      priorityLevel: request.priority,
      status: request.status,
      requestTime: request.createdAt,
      lastUpdated: request.updatedAt,
      region: request.region?.name,
      district: request.district?.name,
      landmark: request.pickupLocation,
      patientPhone: request.patient?.phone,
      station: stationName,
      ambulance: request.ambulance ? {
        code: request.ambulance.ambulanceNumber,
        type: request.ambulance.vehicleType,
      } : null,
      driverAssigned: Boolean(request.driverId),
      nurseAssigned: Boolean(request.nurseId),
      driverStation: request.driver?.station?.name || null,
      nurseStation: request.nurse?.station?.name || null,
      hospital: request.destinationHospital?.name,
      estimatedArrival,
      timeline: request.statusLogs.map(log => ({
        status: log.toStatus,
        timestamp: log.createdAt,
      }))
    };
  }
}
