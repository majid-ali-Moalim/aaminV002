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
import { TrackingGateway } from '../tracking/tracking.gateway';
import { TrackingService } from '../tracking/tracking.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { ManualAssignHospitalDto } from './dto/manual-assign-hospital.dto';

const CASE_INCLUDE = {
  hospital: { include: { region: true, district: true } },
  emergencyRequest: {
    include: {
      patient: true,
      driver: true,
      nurse: true,
      ambulance: true,
      incidentCategory: true,
      dispatcher: true,
      statusLogs: { orderBy: { createdAt: 'desc' as const } },
      patientCareRecords: {
        orderBy: { createdAt: 'desc' as const },
        include: { nurse: { select: { firstName: true, lastName: true } } },
      },
      incidentReport: true,
    },
  },
} satisfies Prisma.HospitalCoordinationCaseInclude;

@Injectable()
export class HospitalCoordinationService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private trackingGateway: TrackingGateway,
    private trackingService: TrackingService,
    private hospitalsService: HospitalsService,
  ) {}

  private async teamUserIds(requestId: string): Promise<string[]> {
    const req = await this.prisma.emergencyRequest.findUnique({
      where: { id: requestId },
      include: { driver: true, nurse: true },
    });
    if (!req) return [];
    return [req.driver?.userId, req.nurse?.userId].filter(Boolean) as string[];
  }

  private async notifyFieldTeamDestinationUpdate(
    requestId: string,
    trackingCode: string,
    destinationLabel: string,
    userId?: string,
  ) {
    const assignedUserIds = await this.teamUserIds(requestId);
    if (!assignedUserIds.length) return;

    await this.notifications.dispatchEvent({
      eventKey: 'MISSION_UPDATED',
      title: 'Hospital Destination Updated',
      message: `Case ${trackingCode} — destination set to ${destinationLabel}`,
      type: 'EMERGENCY',
      category: 'MISSION',
      priority: 'HIGH',
      entityType: 'EmergencyRequest',
      entityId: requestId,
      context: { createdById: userId, assignedUserIds },
    });
  }

  private async emitDestinationTrackingUpdate(trackingCode: string) {
    try {
      const trackingData = await this.trackingService.findByCodeOrPhone(trackingCode);
      this.trackingGateway.emitTrackingUpdate(trackingCode, trackingData);
    } catch {
      // Tracking payload is optional for coordination updates
    }
  }

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

      await this.notifications.notifyHospitalStaff(req.destinationHospitalId, {
        eventKey: 'HOSPITAL_RESPONSE',
        title: 'New Emergency Case Assigned',
        message: `Case ${req.trackingCode} has been assigned to your hospital.`,
        type: 'PATIENT_CARE',
        category: 'HOSPITAL',
        priority: req.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        entityType: 'HospitalCoordinationCase',
        entityId: req.id,
        redirectUrl: '/hospital/emergency-cases?tab=incoming',
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
    assignedCasesOnly?: boolean;
  }) {
    const and: Prisma.HospitalWhereInput[] = [];
    if (filters?.regionId) and.push({ regionId: filters.regionId });
    if (filters?.districtId) and.push({ districtId: filters.districtId });
    if (filters?.hospitalType) and.push({ hospitalType: filters.hospitalType });
    if (filters?.status) and.push({ availabilityStatus: filters.status });
    if (filters?.isActive !== undefined) and.push({ isActive: filters.isActive });
    if (filters?.assignedCasesOnly) {
      and.push({
        OR: [
          { coordinationCases: { some: { deletedAt: null } } },
          { requests: { some: { destinationHospitalId: { not: null } } } },
        ],
      });
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      and.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { hospitalCode: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.HospitalWhereInput = and.length ? { AND: and } : {};

    const rows = await this.prisma.hospital.findMany({
      where,
      include: {
        region: true,
        district: true,
        _count: {
          select: {
            coordinationCases: { where: { deletedAt: null } },
            requests: { where: { destinationHospitalId: { not: null } } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map(({ _count, ...h }) => ({
      ...h,
      assignedCaseCount: _count.coordinationCases + _count.requests,
    }));
  }

  async updateAvailability(
    hospitalId: string,
    data: {
      beds?: number;
      occupiedBeds?: number;
      icuTotalBeds?: number;
      icuOccupiedBeds?: number;
      emergencyUnitStatus?: string;
      capacityStatus?: string;
      availabilityStatus?: string;
      operationalStatus?: string;
      emergencyBeds?: number;
      operatingRooms?: number;
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

    if (availabilityStatus !== hospital.availabilityStatus) {
      await this.notifications.dispatchEvent({
        eventKey: 'HOSPITAL_RESPONSE',
        title: 'Hospital Availability Changed',
        message: `${hospital.name} is now ${availabilityStatus}`,
        type: 'PATIENT_CARE',
        category: 'HOSPITAL',
        priority: ['Full Capacity', 'Temporarily Unavailable', 'Under Maintenance'].includes(
          availabilityStatus,
        )
          ? 'HIGH'
          : 'MEDIUM',
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
    const rows = await this.listCasesRaw(filters);
    return this.enrichCasesWithCoordinationContext(rows);
  }

  private refusalReasonLabel(reason?: string | null) {
    if (!reason) return 'Not specified';
    return reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private async enrichCasesWithCoordinationContext(
    cases: Awaited<ReturnType<HospitalCoordinationService['listCasesRaw']>>,
  ) {
    if (!cases.length) return [];

    const requestIds = [...new Set(cases.map((c) => c.emergencyRequestId))];
    const timeline = await this.prisma.hospitalCoordinationCase.findMany({
      where: { emergencyRequestId: { in: requestIds }, deletedAt: null },
      include: { hospital: { include: { region: true, district: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const byRequest = new Map<string, typeof timeline>();
    for (const row of timeline) {
      const list = byRequest.get(row.emergencyRequestId) ?? [];
      list.push(row);
      byRequest.set(row.emergencyRequestId, list);
    }

    return cases.map((c) => {
      const history = byRequest.get(c.emergencyRequestId) ?? [];
      const rejectedHospitals = history
        .filter((h) => h.stage === 'REFUSED')
        .map((h) => ({
          hospitalId: h.hospitalId,
          hospitalName: h.hospital?.name ?? '—',
          branchName: c.emergencyRequest?.destinationHospitalBranchName ?? null,
          refusalReason: this.refusalReasonLabel(h.refusalReason),
          refusalReasonCode: h.refusalReason,
          refusalNotes: h.refusalNotes,
          rejectedAt: h.updatedAt,
        }));
      const acceptedEntry =
        history.find((h) => h.stage === 'ACCEPTED' || h.status === 'ACCEPTED') ?? null;
      const nurseRecord = c.emergencyRequest?.patientCareRecords?.[0];
      const nurseName = nurseRecord?.nurse
        ? `${nurseRecord.nurse.firstName ?? ''} ${nurseRecord.nurse.lastName ?? ''}`.trim()
        : c.emergencyRequest?.nurse
          ? `${c.emergencyRequest.nurse.firstName ?? ''} ${c.emergencyRequest.nurse.lastName ?? ''}`.trim()
          : null;

      return {
        ...c,
        acceptedHospital: acceptedEntry
          ? {
              hospitalId: acceptedEntry.hospitalId,
              hospitalName: acceptedEntry.hospital?.name ?? c.hospital?.name,
              receivingStaffName: acceptedEntry.receivingStaffName,
              handoverCompletedAt: acceptedEntry.handoverCompletedAt,
              acceptedAt: acceptedEntry.updatedAt,
            }
          : c.stage === 'ACCEPTED'
            ? {
                hospitalId: c.hospitalId,
                hospitalName: c.hospital?.name,
                receivingStaffName: c.receivingStaffName,
                handoverCompletedAt: c.handoverCompletedAt,
                acceptedAt: c.updatedAt,
              }
            : null,
        rejectedHospitals,
        nurseHandover: nurseRecord
          ? {
              nurseName,
              interventions: nurseRecord.treatmentGiven,
              notes: nurseRecord.clinicalNotes ?? nurseRecord.treatmentGiven,
              recordedAt: nurseRecord.createdAt,
            }
          : nurseName
            ? { nurseName, notes: c.notes, recordedAt: c.handoverCompletedAt ?? c.updatedAt }
            : null,
        destinationBranchName: c.emergencyRequest?.destinationHospitalBranchName ?? null,
      };
    });
  }

  private async listCasesRaw(filters: {
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

    await this.notifications.notifyHospitalStaff(existing.hospitalId, {
      eventKey: 'HOSPITAL_RESPONSE',
      title: 'Case Accepted',
      message: `Case ${existing.caseNumber} accepted. Prepare receiving team.`,
      type: 'PATIENT_CARE',
      category: 'HOSPITAL',
      priority: 'MEDIUM',
      entityType: 'HospitalCoordinationCase',
      entityId: caseId,
      redirectUrl: `/hospital/emergency-cases/${caseId}`,
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

  async completeHandover(
    caseId: string,
    userId?: string,
    payload?: { receivingStaffName?: string; department?: string; notes?: string },
  ) {
    const noteParts = [
      payload?.department ? `Department: ${payload.department}` : '',
      payload?.notes?.trim() ?? '',
    ].filter(Boolean);

    const updated = await this.prisma.hospitalCoordinationCase.update({
      where: { id: caseId },
      data: {
        stage: 'ACCEPTED',
        status: 'UNDER_TREATMENT',
        handoverCompletedAt: new Date(),
        receivingStaffName: payload?.receivingStaffName || payload?.department,
        notes: noteParts.length ? noteParts.join('\n') : undefined,
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

  async getRequestCoordinationHistory(requestId: string) {
    const request = await this.prisma.emergencyRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        trackingCode: true,
        destination: true,
        destinationHospitalId: true,
        destinationHospitalBranchName: true,
      },
    });
    if (!request) throw new NotFoundException('Emergency request not found');

    const history = await this.prisma.hospitalCoordinationCase.findMany({
      where: { emergencyRequestId: requestId, deletedAt: null },
      include: { hospital: { include: { region: true, district: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      ...request,
      history: history.map((row) => ({
        id: row.id,
        hospitalId: row.hospitalId,
        hospitalName: row.hospital?.name ?? '—',
        stage: row.stage,
        status: row.status,
        refusalReason: row.refusalReason,
        refusalNotes: row.refusalNotes,
        receivingStaffName: row.receivingStaffName,
        updatedAt: row.updatedAt,
      })),
    };
  }

  async assignHospitalToRequest(
    requestId: string,
    data: {
      hospitalId: string;
      outcome: 'ACCEPTED' | 'REJECTED';
      branchId?: string;
      branchName?: string;
      receivingStaffName?: string;
      reason?: HospitalRefusalReason;
      notes?: string;
    },
    userId?: string,
  ) {
    const request = await this.prisma.emergencyRequest.findUnique({
      where: { id: requestId },
      include: { driver: true, nurse: true },
    });
    if (!request) throw new NotFoundException('Emergency request not found');

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: data.hospitalId },
      include: { region: true, district: true },
    });
    if (!hospital) throw new NotFoundException('Hospital not found');

    let coordCase = await this.prisma.hospitalCoordinationCase.findFirst({
      where: {
        emergencyRequestId: requestId,
        hospitalId: data.hospitalId,
        deletedAt: null,
      },
    });

    if (data.outcome === 'REJECTED') {
      if (!data.reason) {
        throw new BadRequestException('Refusal reason is required when rejecting a hospital');
      }

      if (!coordCase) {
        coordCase = await this.prisma.hospitalCoordinationCase.create({
          data: {
            caseNumber: await this.nextCaseNumber(),
            emergencyRequestId: requestId,
            hospitalId: data.hospitalId,
            stage: 'REFUSED',
            status: 'REJECTED',
            priority: request.priority,
            refusalReason: data.reason,
            refusalNotes: data.notes,
            recordedById: userId,
          },
          include: CASE_INCLUDE,
        });
      } else {
        coordCase = await this.prisma.hospitalCoordinationCase.update({
          where: { id: coordCase.id },
          data: {
            stage: 'REFUSED',
            status: 'REJECTED',
            refusalReason: data.reason,
            refusalNotes: data.notes,
            recordedById: userId,
          },
          include: CASE_INCLUDE,
        });
      }

      if (request.destinationHospitalId === data.hospitalId) {
        await this.prisma.emergencyRequest.update({
          where: { id: requestId },
          data: {
            destinationHospitalId: null,
            destination: null,
            destinationHospitalBranchId: null,
            destinationHospitalBranchName: null,
          },
        });

        await this.notifyFieldTeamDestinationUpdate(
          requestId,
          request.trackingCode,
          'Cleared — hospital assignment removed',
          userId,
        );
        await this.emitDestinationTrackingUpdate(request.trackingCode);
      }

      await this.notifications.dispatchEvent({
        eventKey: 'HOSPITAL_RESPONSE',
        title: 'Hospital Rejected',
        message: `${hospital.name} refused case ${request.trackingCode}`,
        type: 'PATIENT_CARE',
        category: 'HOSPITAL',
        priority: 'HIGH',
        entityType: 'HospitalCoordination',
        entityId: coordCase.id,
        redirectUrl: '/admin/hospitals/refused',
        context: { createdById: userId },
      });

      return { outcome: 'REJECTED' as const, coordinationCase: coordCase };
    }

    const destinationLabel = data.branchName
      ? `${hospital.name} — ${data.branchName}`
      : hospital.name;

    await this.prisma.hospitalCoordinationCase.updateMany({
      where: {
        emergencyRequestId: requestId,
        hospitalId: { not: data.hospitalId },
        stage: { in: ['ACCEPTED', 'INCOMING'] },
        deletedAt: null,
      },
      data: {
        stage: 'REFUSED',
        status: 'REJECTED',
        refusalReason: 'OTHER',
        refusalNotes: 'Reassigned to another hospital',
        recordedById: userId,
      },
    });

    await this.prisma.emergencyRequest.update({
      where: { id: requestId },
      data: {
        destinationHospitalId: data.hospitalId,
        destination: destinationLabel,
        destinationHospitalBranchId: data.branchId ?? null,
        destinationHospitalBranchName: data.branchName ?? null,
      },
    });

    if (!coordCase) {
      coordCase = await this.prisma.hospitalCoordinationCase.create({
        data: {
          caseNumber: await this.nextCaseNumber(),
          emergencyRequestId: requestId,
          hospitalId: data.hospitalId,
          stage: 'ACCEPTED',
          status: 'ACCEPTED',
          priority: request.priority,
          receivingStaffName: data.receivingStaffName,
          notes: data.notes ?? null,
          recordedById: userId,
        },
        include: CASE_INCLUDE,
      });
    } else {
      coordCase = await this.prisma.hospitalCoordinationCase.update({
        where: { id: coordCase.id },
        data: {
          stage: 'ACCEPTED',
          status: 'ACCEPTED',
          receivingStaffName: data.receivingStaffName,
          notes: data.notes ?? null,
          refusalReason: null,
          refusalNotes: null,
          recordedById: userId,
        },
        include: CASE_INCLUDE,
      });
    }

    await this.notifications.notifyHospitalStaff(data.hospitalId, {
      eventKey: 'HOSPITAL_RESPONSE',
      title: 'Emergency Case Assigned',
      message: `Case ${request.trackingCode} has been assigned to ${hospital.name}. Prepare receiving team.`,
      type: 'PATIENT_CARE',
      category: 'HOSPITAL',
      priority: request.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      entityType: 'HospitalCoordinationCase',
      entityId: coordCase.id,
      redirectUrl: `/hospital/emergency-cases/${coordCase.id}`,
    });

    await this.notifications.dispatchEvent({
      eventKey: 'HOSPITAL_RESPONSE',
      title: 'Hospital Accepted',
      message: `${hospital.name} accepted case ${request.trackingCode}`,
      type: 'PATIENT_CARE',
      category: 'HOSPITAL',
      priority: 'MEDIUM',
      entityType: 'HospitalCoordination',
      entityId: coordCase.id,
      redirectUrl: '/admin/hospitals/accepted',
      context: { createdById: userId },
    });

    await this.notifyFieldTeamDestinationUpdate(
      requestId,
      request.trackingCode,
      destinationLabel,
      userId,
    );
    await this.emitDestinationTrackingUpdate(request.trackingCode);

    return {
      outcome: 'ACCEPTED' as const,
      coordinationCase: coordCase,
      destination: destinationLabel,
    };
  }

  async assignManualHospitalToRequest(
    requestId: string,
    data: ManualAssignHospitalDto,
    userId?: string,
  ) {
    const hospital = await this.hospitalsService.createManualAssignmentHospital(data);
    const branches = this.hospitalsService.parseBranches(hospital) as Array<{ id: string; name: string }>;
    const branchName = data.branchName?.trim() || undefined;
    const branch = branchName ? branches.find((b) => b.name === branchName) : branches[0];

    return this.assignHospitalToRequest(
      requestId,
      {
        hospitalId: hospital.id,
        outcome: 'ACCEPTED',
        branchId: branch?.id,
        branchName,
        receivingStaffName: data.receivingStaffName,
        notes: data.notes,
      },
      userId,
    );
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
