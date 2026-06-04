import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  HospitalCaseStage,
  HospitalCaseStatus,
  HospitalRefusalReason,
  Prisma,
  Priority,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const CASE_INCLUDE = {
  hospital: { include: { region: true, district: true } },
  emergencyRequest: {
    include: {
      patient: true,
      driver: true,
      nurse: true,
      ambulance: true,
      incidentCategory: true,
    },
  },
} satisfies Prisma.HospitalCoordinationCaseInclude;

@Injectable()
export class HospitalCoordinationService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async nextCaseNumber() {
    const count = await this.prisma.hospitalCoordinationCase.count();
    return `HCC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  async syncIncomingFromRequests() {
    const requests = await this.prisma.emergencyRequest.findMany({
      where: {
        destinationHospitalId: { not: null },
        status: { in: ['TRANSPORTING', 'ARRIVED_HOSPITAL', 'DISPATCHED', 'EN_ROUTE'] },
      },
    });

    for (const req of requests) {
      const existing = await this.prisma.hospitalCoordinationCase.findFirst({
        where: { emergencyRequestId: req.id, deletedAt: null },
      });
      if (existing || !req.destinationHospitalId) continue;

      await this.prisma.hospitalCoordinationCase.create({
        data: {
          caseNumber: await this.nextCaseNumber(),
          emergencyRequestId: req.id,
          hospitalId: req.destinationHospitalId,
          stage: 'INCOMING',
          status: 'PENDING_REVIEW',
          priority: req.priority,
        },
      });

      await this.notifications.dispatchEvent({
        eventKey: 'HOSPITAL_RESPONSE',
        title: 'New Incoming Case',
        message: `Case ${req.trackingCode} is en route to hospital`,
        type: 'PATIENT_CARE',
        category: 'HOSPITAL',
        priority: req.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        entityType: 'HospitalCoordination',
        entityId: req.id,
        redirectUrl: '/admin/hospitals/incoming',
      });
    }
  }

  async getOverview() {
    await this.syncIncomingFromRequests();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalHospitals,
      activeHospitals,
      incomingToday,
      pendingIncoming,
      queueCount,
      acceptedToday,
      refusedToday,
    ] = await Promise.all([
      this.prisma.hospital.count(),
      this.prisma.hospital.count({ where: { isActive: true } }),
      this.prisma.hospitalCoordinationCase.count({
        where: { createdAt: { gte: today }, deletedAt: null },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { stage: 'INCOMING', status: 'PENDING_REVIEW', deletedAt: null },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { stage: 'HANDOVER', status: { in: ['WAITING', 'IN_PROGRESS'] }, deletedAt: null },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { stage: 'ACCEPTED', updatedAt: { gte: today }, deletedAt: null },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { stage: 'REFUSED', updatedAt: { gte: today }, deletedAt: null },
      }),
    ]);

    const hospitals = await this.prisma.hospital.findMany({
      include: { region: true, district: true },
      orderBy: { name: 'asc' },
    });

    const availableHospitals = hospitals.filter(
      (h) => h.isActive && ['Available', 'Limited Capacity'].includes(h.availabilityStatus),
    ).length;
    const fullHospitals = hospitals.filter((h) => h.availabilityStatus === 'Full Capacity').length;

    return {
      kpis: {
        totalHospitals,
        activeHospitals,
        inactiveHospitals: totalHospitals - activeHospitals,
        emergencyCenters: hospitals.filter((h) => h.erReady && h.isActive).length,
        availableHospitals,
        fullHospitals,
        busyHospitals: hospitals.filter((h) => h.availabilityStatus === 'Busy').length,
        incomingToday,
        pendingIncoming,
        acceptedToday,
        refusedToday,
        queueCount,
      },
    };
  }

  async listHospitals(filters?: {
    search?: string;
    regionId?: string;
    districtId?: string;
    hospitalType?: string;
    status?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.HospitalWhereInput = {};
    if (filters?.regionId) where.regionId = filters.regionId;
    if (filters?.districtId) where.districtId = filters.districtId;
    if (filters?.hospitalType) where.hospitalType = filters.hospitalType;
    if (filters?.status) where.availabilityStatus = filters.status;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search?.trim()) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { hospitalCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.hospital.findMany({
      where,
      include: { region: true, district: true },
      orderBy: { name: 'asc' },
    });
  }

  async updateAvailability(
    hospitalId: string,
    data: {
      beds?: number;
      occupiedBeds?: number;
      icuTotalBeds?: number;
      icuOccupiedBeds?: number;
      emergencyUnitStatus?: string;
      availabilityStatus?: string;
      erReady?: boolean;
    },
    userId?: string,
  ) {
    const hospital = await this.prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) throw new NotFoundException('Hospital not found');

    const capacityPct =
      data.beds && data.occupiedBeds !== undefined
        ? Math.round((data.occupiedBeds / Math.max(data.beds, 1)) * 100)
        : null;

    let availabilityStatus = data.availabilityStatus ?? hospital.availabilityStatus;
    if (!data.availabilityStatus && capacityPct !== null) {
      if (capacityPct >= 95) availabilityStatus = 'Full Capacity';
      else if (capacityPct >= 80) availabilityStatus = 'Busy';
      else if (capacityPct >= 60) availabilityStatus = 'Limited Capacity';
      else availabilityStatus = 'Available';
    }

    const updated = await this.prisma.hospital.update({
      where: { id: hospitalId },
      data: {
        ...data,
        availabilityStatus,
        status: availabilityStatus,
        lastAvailabilityUpdate: new Date(),
      },
      include: { region: true, district: true },
    });

    if (availabilityStatus === 'Full Capacity') {
      await this.notifications.dispatchEvent({
        eventKey: 'HOSPITAL_RESPONSE',
        title: 'Capacity Full Warning',
        message: `${hospital.name} reported full capacity`,
        type: 'PATIENT_CARE',
        category: 'HOSPITAL',
        priority: 'HIGH',
        entityType: 'Hospital',
        entityId: hospitalId,
        redirectUrl: '/admin/hospitals/availability',
        context: { createdById: userId },
      });
    }

    return updated;
  }

  async listCases(filters: {
    stage?: HospitalCaseStage;
    status?: HospitalCaseStatus | HospitalCaseStatus[];
    hospitalId?: string;
    search?: string;
    regionId?: string;
    districtId?: string;
  }) {
    await this.syncIncomingFromRequests();

    const where: Prisma.HospitalCoordinationCaseWhereInput = { deletedAt: null };
    if (filters.stage) where.stage = filters.stage;
    if (filters.status) {
      where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
    }
    if (filters.hospitalId) where.hospitalId = filters.hospitalId;
    if (filters.regionId || filters.districtId) {
      where.hospital = {
        regionId: filters.regionId,
        districtId: filters.districtId,
      };
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { caseNumber: { contains: q, mode: 'insensitive' } },
        { emergencyRequest: { trackingCode: { contains: q, mode: 'insensitive' } } },
        { emergencyRequest: { patient: { fullName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.hospitalCoordinationCase.findMany({
      where,
      include: CASE_INCLUDE,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async acceptCase(caseId: string, userId?: string, receivingStaffName?: string) {
    const existing = await this.getCase(caseId);
    const updated = await this.prisma.hospitalCoordinationCase.update({
      where: { id: caseId },
      data: {
        stage: 'ACCEPTED',
        status: 'ACCEPTED',
        receivingStaffName,
        recordedById: userId,
      },
      include: CASE_INCLUDE,
    });

    await this.notifications.dispatchEvent({
      eventKey: 'HOSPITAL_RESPONSE',
      title: 'Case Accepted',
      message: `Hospital accepted case ${existing.caseNumber}`,
      type: 'PATIENT_CARE',
      category: 'HOSPITAL',
      priority: 'MEDIUM',
      entityType: 'HospitalCoordination',
      entityId: caseId,
      redirectUrl: '/admin/hospitals/accepted',
      context: { createdById: userId },
    });

    return updated;
  }

  async rejectCase(
    caseId: string,
    reason: HospitalRefusalReason,
    notes?: string,
    userId?: string,
  ) {
    const existing = await this.getCase(caseId);
    const updated = await this.prisma.hospitalCoordinationCase.update({
      where: { id: caseId },
      data: {
        stage: 'REFUSED',
        status: 'REJECTED',
        refusalReason: reason,
        refusalNotes: notes,
        recordedById: userId,
      },
      include: CASE_INCLUDE,
    });

    await this.notifications.dispatchEvent({
      eventKey: 'HOSPITAL_RESPONSE',
      title: 'Case Rejected',
      message: `Case ${existing.caseNumber} refused — ${reason.replace(/_/g, ' ')}`,
      type: 'PATIENT_CARE',
      category: 'HOSPITAL',
      priority: 'HIGH',
      entityType: 'HospitalCoordination',
      entityId: caseId,
      redirectUrl: '/admin/hospitals/refused',
      context: { createdById: userId },
    });

    return updated;
  }

  async moveToHandover(caseId: string, userId?: string) {
    const queueCount = await this.prisma.hospitalCoordinationCase.count({
      where: { stage: 'HANDOVER', status: { in: ['WAITING', 'IN_PROGRESS'] }, deletedAt: null },
    });

    const updated = await this.prisma.hospitalCoordinationCase.update({
      where: { id: caseId },
      data: {
        stage: 'HANDOVER',
        status: 'WAITING',
        queueNumber: queueCount + 1,
        arrivalTime: new Date(),
      },
      include: CASE_INCLUDE,
    });

    await this.notifications.dispatchEvent({
      eventKey: 'HOSPITAL_RESPONSE',
      title: 'Ambulance Arriving',
      message: `Ambulance arriving for case ${updated.caseNumber} — added to handover queue`,
      type: 'PATIENT_CARE',
      category: 'HOSPITAL',
      priority: 'HIGH',
      entityType: 'HospitalCoordination',
      entityId: caseId,
      redirectUrl: '/admin/hospitals/handover',
      context: { createdById: userId },
    });

    return updated;
  }

  async startHandover(caseId: string, userId?: string) {
    return this.prisma.hospitalCoordinationCase.update({
      where: { id: caseId },
      data: { status: 'IN_PROGRESS', handoverStartAt: new Date(), recordedById: userId },
      include: CASE_INCLUDE,
    });
  }

  async completeHandover(caseId: string, userId?: string, receivingStaffName?: string) {
    const updated = await this.prisma.hospitalCoordinationCase.update({
      where: { id: caseId },
      data: {
        stage: 'ACCEPTED',
        status: 'UNDER_TREATMENT',
        handoverCompletedAt: new Date(),
        receivingStaffName,
        recordedById: userId,
      },
      include: CASE_INCLUDE,
    });

    await this.notifications.dispatchEvent({
      eventKey: 'HOSPITAL_RESPONSE',
      title: 'Handover Completed',
      message: `Handover completed for case ${updated.caseNumber}`,
      type: 'PATIENT_CARE',
      category: 'HOSPITAL',
      priority: 'MEDIUM',
      entityType: 'HospitalCoordination',
      entityId: caseId,
      redirectUrl: '/admin/hospitals/accepted',
      context: { createdById: userId },
    });

    return updated;
  }

  async updateCaseStatus(caseId: string, status: HospitalCaseStatus, userId?: string) {
    return this.prisma.hospitalCoordinationCase.update({
      where: { id: caseId },
      data: { status, recordedById: userId },
      include: CASE_INCLUDE,
    });
  }

  async getCase(caseId: string) {
    const row = await this.prisma.hospitalCoordinationCase.findFirst({
      where: { id: caseId, deletedAt: null },
      include: CASE_INCLUDE,
    });
    if (!row) throw new NotFoundException('Coordination case not found');
    return row;
  }

  async getAnalytics(filters?: {
    startDate?: string;
    endDate?: string;
    hospitalId?: string;
    regionId?: string;
  }) {
    const where: Prisma.HospitalCoordinationCaseWhereInput = { deletedAt: null };
    if (filters?.hospitalId) where.hospitalId = filters.hospitalId;
    if (filters?.regionId) where.hospital = { regionId: filters.regionId };
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const cases = await this.prisma.hospitalCoordinationCase.findMany({
      where,
      include: { hospital: true },
    });

    const received = cases.length;
    const accepted = cases.filter((c) => c.stage === 'ACCEPTED' || c.status === 'ACCEPTED').length;
    const refused = cases.filter((c) => c.stage === 'REFUSED').length;

    const handoverTimes = cases
      .filter((c) => c.handoverStartAt && c.handoverCompletedAt)
      .map((c) => (c.handoverCompletedAt!.getTime() - c.handoverStartAt!.getTime()) / 60000);

    const avgHandover =
      handoverTimes.length > 0
        ? Math.round(handoverTimes.reduce((a, b) => a + b, 0) / handoverTimes.length)
        : 0;

    const byHospital = Object.values(
      cases.reduce<Record<string, { name: string; received: number; accepted: number; refused: number }>>(
        (acc, c) => {
          const id = c.hospitalId;
          if (!acc[id]) acc[id] = { name: c.hospital.name, received: 0, accepted: 0, refused: 0 };
          acc[id].received++;
          if (c.stage === 'ACCEPTED') acc[id].accepted++;
          if (c.stage === 'REFUSED') acc[id].refused++;
          return acc;
        },
        {},
      ),
    );

    const refusalReasons = cases
      .filter((c) => c.refusalReason)
      .reduce<Record<string, number>>((acc, c) => {
        const k = c.refusalReason!;
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

    return {
      kpis: {
        casesReceived: received,
        casesAccepted: accepted,
        casesRefused: refused,
        acceptanceRate: received ? Math.round((accepted / received) * 100) : 0,
        refusalRate: received ? Math.round((refused / received) * 100) : 0,
        avgHandoverTimeMins: avgHandover,
      },
      byHospital,
      refusalReasons,
      trend: [],
    };
  }
}
