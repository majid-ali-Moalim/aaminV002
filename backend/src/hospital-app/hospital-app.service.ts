import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HospitalCaseStage, HospitalCaseStatus, EmergencyRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HospitalCoordinationService } from '../hospital-coordination/hospital-coordination.service';
import { EtaCalculationService } from '../tracking/eta-calculation.service';

const ACTIVE_MISSION_STATUSES: EmergencyRequestStatus[] = [
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
];

const MISSION_PROGRESS = [
  { key: 'ASSIGNED', label: 'Assigned', match: ['ASSIGNED', 'DISPATCHED'] },
  { key: 'EN_ROUTE', label: 'En Route To Scene', match: ['EN_ROUTE'] },
  { key: 'ARRIVED_SCENE', label: 'Arrived At Scene', match: ['ARRIVED_SCENE'] },
  { key: 'PATIENT_LOADED', label: 'Patient Loaded', match: ['PATIENT_STABILIZED'] },
  { key: 'TRANSPORTING', label: 'Transporting Patient', match: ['TRANSPORTING'] },
  { key: 'ARRIVED_HOSPITAL', label: 'Arrived At Hospital', match: ['ARRIVED_HOSPITAL'] },
] as const;

function parseCaseNotes(notes?: string | null) {
  if (!notes?.trim()) return { plainNotes: null as string | null, preparation: null as Record<string, unknown> | null };
  try {
    const parsed = JSON.parse(notes) as { preparation?: Record<string, unknown>; plainNotes?: string };
    if (parsed && typeof parsed === 'object' && parsed.preparation) {
      return { plainNotes: parsed.plainNotes ?? null, preparation: parsed.preparation };
    }
  } catch {
    /* plain text notes */
  }
  return { plainNotes: notes, preparation: null };
}

function serializeCaseNotes(plainNotes: string | null, preparation: Record<string, unknown> | null) {
  if (!preparation) return plainNotes;
  return JSON.stringify({ plainNotes, preparation });
}

@Injectable()
export class HospitalAppService {
  constructor(
    private prisma: PrismaService,
    private coordination: HospitalCoordinationService,
    private etaService: EtaCalculationService,
  ) {}

  resolveHospitalId(user: { hospitalId?: string; employeeId?: string }): string {
    if (user.hospitalId) return user.hospitalId;
    throw new ForbiddenException('No hospital linked to this account');
  }

  async getProfile(user: { hospitalId?: string; sub?: string }) {
    const hospitalId = this.resolveHospitalId(user);
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: { region: true, district: true },
    });
    if (!hospital) throw new NotFoundException('Hospital not found');

    let userRecord = null;
    if (user.sub) {
      userRecord = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: {
          id: true,
          username: true,
          email: true,
          mustChangePassword: true,
        },
      });
    }

    return { hospital, account: userRecord };
  }

  async getDashboard(user: { hospitalId?: string }) {
    const hospitalId = this.resolveHospitalId(user);
    await this.coordination.syncIncomingFromRequests();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hospital = await this.prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) throw new NotFoundException('Hospital not found');

    const baseWhere = { hospitalId, deletedAt: null as Date | null };

    const [
      incomingToday,
      acceptedToday,
      rejectedToday,
      receivedToday,
      pendingIncoming,
      handoverQueue,
      enRoute,
    ] = await Promise.all([
      this.prisma.hospitalCoordinationCase.count({
        where: { ...baseWhere, createdAt: { gte: today } },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { ...baseWhere, status: 'ACCEPTED', updatedAt: { gte: today } },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { ...baseWhere, status: 'REJECTED', updatedAt: { gte: today } },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { ...baseWhere, handoverCompletedAt: { gte: today } },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { ...baseWhere, stage: 'INCOMING', status: 'PENDING_REVIEW' },
      }),
      this.prisma.hospitalCoordinationCase.count({
        where: { ...baseWhere, stage: 'HANDOVER', status: { in: ['WAITING', 'IN_PROGRESS'] } },
      }),
      this.prisma.emergencyRequest.count({
        where: {
          destinationHospitalId: hospitalId,
          status: { in: ['TRANSPORTING', 'EN_ROUTE', 'DISPATCHED'] },
        },
      }),
    ]);

    const availableBeds = Math.max(0, hospital.beds - hospital.occupiedBeds);
    const icuAvailable = Math.max(0, hospital.icuTotalBeds - hospital.icuOccupiedBeds);

    const recentCases = await this.prisma.hospitalCoordinationCase.findMany({
      where: baseWhere,
      include: {
        emergencyRequest: {
          include: { patient: true, driver: true, nurse: true, ambulance: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    });

    const completedHandovers = recentCases.filter(
      (c) => c.handoverStartAt && c.handoverCompletedAt,
    );
    const averageHandoverTime =
      completedHandovers.length > 0
        ? Math.round(
            completedHandovers.reduce(
              (sum, c) =>
                sum +
                ((c.handoverCompletedAt as Date).getTime() -
                  (c.handoverStartAt as Date).getTime()),
              0,
            ) /
              completedHandovers.length /
              60000,
          )
        : 0;

    const bedUtilization = hospital.beds
      ? Math.round((hospital.occupiedBeds / Math.max(hospital.beds, 1)) * 100)
      : 0;
    const icuUtilization = hospital.icuTotalBeds
      ? Math.round((hospital.icuOccupiedBeds / Math.max(hospital.icuTotalBeds, 1)) * 100)
      : 0;
    const emergencyUnitHealthy = ['Operational', 'Available', 'Busy'].includes(
      hospital.emergencyUnitStatus,
    );
    const statusScore =
      hospital.availabilityStatus === 'Available'
        ? 30
        : hospital.availabilityStatus === 'Limited Capacity'
          ? 22
          : hospital.availabilityStatus === 'Emergency Only'
            ? 16
            : 6;
    const readinessScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          statusScore +
            Math.min(30, (availableBeds / Math.max(hospital.beds, 1)) * 30) +
            Math.min(25, (icuAvailable / Math.max(hospital.icuTotalBeds || 1, 1)) * 25) +
            (emergencyUnitHealthy ? 15 : 0),
        ),
      ),
    );

    const alerts = [
      availableBeds <= 5 && {
        id: 'beds-low',
        severity: availableBeds === 0 ? 'critical' : 'warning',
        title: availableBeds === 0 ? 'No general beds available' : 'General beds below threshold',
        message: `${availableBeds} general beds available for new emergency assignments.`,
      },
      hospital.icuTotalBeds > 0 &&
        icuAvailable <= 1 && {
          id: 'icu-low',
          severity: icuAvailable === 0 ? 'critical' : 'warning',
          title: icuAvailable === 0 ? 'ICU is full' : 'ICU nearing capacity',
          message: `${icuAvailable} ICU beds available.`,
        },
      ['Full', 'Closed'].includes(hospital.emergencyUnitStatus) && {
        id: 'ed-status',
        severity: 'critical',
        title: `Emergency Department ${hospital.emergencyUnitStatus}`,
        message: 'Dispatchers should route only compatible or unavoidable critical cases.',
      },
      hospital.availabilityStatus !== 'Available' && {
        id: 'availability',
        severity: hospital.availabilityStatus === 'Full Capacity' ? 'critical' : 'warning',
        title: `Hospital status: ${hospital.availabilityStatus}`,
        message: 'This status is visible to dispatchers, administrators, and coordinators.',
      },
    ].filter(Boolean);

    return {
      kpis: {
        incomingToday,
        acceptedToday,
        rejectedToday,
        patientsReceived: receivedToday,
        availableBeds,
        icuAvailable,
        pendingIncoming,
        handoverQueue,
        enRoute,
        averageHandoverTime,
      },
      hospital: {
        id: hospital.id,
        name: hospital.name,
        hospitalCode: hospital.hospitalCode,
        acceptEmergencyCases: hospital.acceptEmergencyCases,
        medicalCapabilities: hospital.medicalCapabilities,
        beds: hospital.beds,
        occupiedBeds: hospital.occupiedBeds,
        icuTotalBeds: hospital.icuTotalBeds,
        icuOccupiedBeds: hospital.icuOccupiedBeds,
        emergencyBeds: hospital.emergencyBeds,
        operatingRooms: hospital.operatingRooms,
        ambulanceReceptionCapacity: hospital.ambulanceReceptionCapacity,
        capacityStatus: hospital.capacityStatus,
        availabilityStatus: hospital.availabilityStatus,
        operationalStatus: hospital.operationalStatus,
        emergencyUnitStatus: hospital.emergencyUnitStatus,
        erReady: hospital.erReady,
        available24_7: hospital.available24_7,
        acceptAmbulanceTransfers: hospital.acceptAmbulanceTransfers,
        lastAvailabilityUpdate: hospital.lastAvailabilityUpdate,
      },
      readiness: {
        score: readinessScore,
        bedUtilization,
        icuUtilization,
        emergencyUnitHealthy,
      },
      alerts,
      activityFeed: recentCases.map((c) => ({
        id: c.id,
        time: c.updatedAt,
        text: `${c.caseNumber} — ${c.stage.replace(/_/g, ' ')} (${c.status.replace(/_/g, ' ')})`,
        caseId: c.id,
        trackingCode: c.emergencyRequest?.trackingCode,
      })),
    };
  }

  async listCases(
    user: { hospitalId?: string },
    filters: {
      tab?: string;
      search?: string;
    },
  ) {
    const hospitalId = this.resolveHospitalId(user);
    let stage: HospitalCaseStage | undefined;
    let status: HospitalCaseStatus | HospitalCaseStatus[] | undefined;

    switch (filters.tab) {
      case 'incoming':
        stage = 'INCOMING';
        status = 'PENDING_REVIEW';
        break;
      case 'active': {
        const all = await this.coordination.listCases({
          hospitalId,
          search: filters.search,
        });
        return all.filter((c) => {
          const reqStatus = c.emergencyRequest?.status as EmergencyRequestStatus | undefined;
          if (!reqStatus) return false;
          const acceptedStage =
            c.stage === 'ACCEPTED' ||
            ['ACCEPTED', 'AWAITING_ARRIVAL', 'UNDER_TREATMENT'].includes(c.status);
          return (
            acceptedStage &&
            ACTIVE_MISSION_STATUSES.includes(reqStatus) &&
            reqStatus !== 'ARRIVED_HOSPITAL'
          );
        });
      }
      case 'accepted':
        stage = 'ACCEPTED';
        status = ['ACCEPTED', 'AWAITING_ARRIVAL', 'UNDER_TREATMENT', 'ADMITTED'];
        break;
      case 'rejected':
        stage = 'REFUSED';
        status = 'REJECTED';
        break;
      case 'completed':
        status = ['COMPLETED', 'DISCHARGED'];
        break;
      default:
        break;
    }

    return this.coordination.listCases({
      hospitalId,
      stage,
      status,
      search: filters.search,
    });
  }

  async getCaseDetail(user: { hospitalId?: string }, caseId: string) {
    const hospitalId = this.resolveHospitalId(user);
    const row = await this.coordination.getCase(caseId);
    if (row.hospitalId !== hospitalId) {
      throw new ForbiddenException('This case is not assigned to your hospital');
    }

    const req = row.emergencyRequest;
    const { plainNotes, preparation } = parseCaseNotes(row.notes);

    const estimatedArrival = req
      ? this.etaService.calculateEta({
          status: req.status,
          priority: req.priority,
          ambulanceId: req.ambulanceId ?? undefined,
        })
      : null;

    const statusIndex = MISSION_PROGRESS.findIndex((s) =>
      (s.match as readonly string[]).includes(req?.status ?? ''),
    );

    const missionProgress = MISSION_PROGRESS.map((step, idx) => ({
      key: step.key,
      label: step.label,
      completed: statusIndex >= idx,
      current: (step.match as readonly string[]).includes(req?.status ?? ''),
    }));

    const latestVitals = req?.patientCareRecords?.[0] ?? null;

    const clinicalNotes =
      req?.patientCareRecords
        ?.filter((r) => r.clinicalNotes?.trim())
        .map((r) => ({
          id: r.id,
          time: r.createdAt,
          author: r.nurse
            ? `${r.nurse.firstName || ''} ${r.nurse.lastName || ''}`.trim() || 'Nurse'
            : 'Nurse',
          text: r.clinicalNotes,
        })) ?? [];

    const treatments =
      req?.patientCareRecords
        ?.flatMap((r) => {
          const items: { time: Date; label: string; source: string }[] = [];
          if (r.treatmentGiven?.trim()) {
            r.treatmentGiven.split(/[,;|\n]+/).forEach((part) => {
              const label = part.trim();
              if (label) items.push({ time: r.createdAt, label, source: 'nurse' });
            });
          }
          if (r.medications?.trim()) {
            r.medications.split(/[,;|\n]+/).forEach((part) => {
              const label = part.trim();
              if (label) items.push({ time: r.createdAt, label: `${label} (medication)`, source: 'nurse' });
            });
          }
          return items;
        }) ?? [];

    const communications: { id: string; time: Date; role: string; author: string; message: string }[] = [];

    if (req?.manualDispatchNotes?.trim()) {
      communications.push({
        id: 'dispatch-notes',
        time: req.dispatchedAt ?? req.createdAt,
        role: 'Dispatcher',
        author: req.dispatcher
          ? `${req.dispatcher.firstName || ''} ${req.dispatcher.lastName || ''}`.trim() || 'Dispatcher'
          : 'Dispatcher',
        message: req.manualDispatchNotes.trim(),
      });
    }

    req?.statusLogs?.forEach((log) => {
      if (log.notes?.trim()) {
        communications.push({
          id: log.id,
          time: log.createdAt,
          role: 'System',
          author: 'Mission Update',
          message: log.notes.trim(),
        });
      }
    });

    clinicalNotes.forEach((n) => {
      communications.push({
        id: n.id,
        time: n.time,
        role: 'Nurse',
        author: n.author,
        message: n.text!,
      });
    });

    communications.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const dispatcherName = req?.dispatcher
      ? `${req.dispatcher.firstName || ''} ${req.dispatcher.lastName || ''}`.trim()
      : null;

    return {
      ...row,
      notes: plainNotes,
      preparation,
      mission: {
        estimatedArrival,
        missionStatus: req?.status?.replace(/_/g, ' ') ?? 'Unknown',
        missionProgress,
        dispatchTime: req?.dispatchedAt ?? req?.assignedAt ?? req?.createdAt,
        dispatcherName: dispatcherName || '—',
        trackingCode: req?.trackingCode,
      },
      patient: {
        name: req?.patient?.fullName ?? req?.callerName ?? 'Unknown',
        age: req?.patient?.age ?? null,
        gender: req?.patient?.gender ?? null,
        bloodType: req?.patient?.bloodType ?? null,
        condition: req?.patientCondition ?? '—',
        symptoms: req?.symptoms ?? '—',
        consciousStatus: req?.consciousStatus ?? '—',
        breathingStatus: req?.breathingStatus ?? '—',
        bleedingStatus: req?.bleedingStatus ?? '—',
        currentStatus: req?.status?.replace(/_/g, ' ') ?? '—',
      },
      clinical: {
        chiefComplaint: req?.incidentReport?.description ?? req?.symptoms ?? '—',
        symptoms: req?.symptoms ?? '—',
        injuryDescription: req?.incidentReport?.description ?? req?.patientCondition ?? '—',
        assessmentNotes: latestVitals?.clinicalNotes ?? '—',
        latestVitals: latestVitals
          ? {
              bloodPressure: latestVitals.bloodPressure,
              pulse: latestVitals.heartRate,
              temperature: latestVitals.temperature,
              respiratoryRate: latestVitals.respiratoryRate,
              oxygenSaturation: latestVitals.oxygenSaturation,
              recordedAt: latestVitals.createdAt,
            }
          : null,
        notesTimeline: clinicalNotes,
        treatments,
      },
      team: {
        ambulanceId: req?.ambulance?.ambulanceNumber ?? req?.ambulanceId ?? '—',
        ambulancePlate: req?.ambulance?.plateNumber ?? null,
        driverName: req?.driver
          ? `${req.driver.firstName || ''} ${req.driver.lastName || ''}`.trim()
          : '—',
        nurseName: req?.nurse
          ? `${req.nurse.firstName || ''} ${req.nurse.lastName || ''}`.trim()
          : '—',
      },
      communications,
    };
  }

  async updatePreparation(
    user: { hospitalId?: string },
    caseId: string,
    preparation: Record<string, unknown>,
  ) {
    const hospitalId = this.resolveHospitalId(user);
    const row = await this.coordination.getCase(caseId);
    if (row.hospitalId !== hospitalId) {
      throw new ForbiddenException('This case is not assigned to your hospital');
    }

    const { plainNotes } = parseCaseNotes(row.notes);
    const notes = serializeCaseNotes(plainNotes, preparation);

    return this.prisma.hospitalCoordinationCase.update({
      where: { id: caseId },
      data: { notes },
    });
  }

  async getIncomingAmbulances(user: { hospitalId?: string }) {
    const hospitalId = this.resolveHospitalId(user);
    return this.prisma.emergencyRequest.findMany({
      where: {
        destinationHospitalId: hospitalId,
        status: { in: ['TRANSPORTING', 'EN_ROUTE', 'DISPATCHED', 'ARRIVED_HOSPITAL'] },
      },
      include: {
        patient: true,
        driver: true,
        nurse: true,
        ambulance: true,
        incidentCategory: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getHandoverQueue(user: { hospitalId?: string }) {
    const hospitalId = this.resolveHospitalId(user);
    return this.coordination.listCases({
      hospitalId,
      stage: 'HANDOVER',
      status: ['WAITING', 'IN_PROGRESS', 'AWAITING_ARRIVAL'],
    });
  }

  async updateCapacity(
    user: { hospitalId?: string; sub?: string },
    body: {
      beds?: number;
      occupiedBeds?: number;
      icuTotalBeds?: number;
      icuOccupiedBeds?: number;
      emergencyBeds?: number;
      operatingRooms?: number;
      capacityStatus?: string;
      availabilityStatus?: string;
    },
  ) {
    const hospitalId = this.resolveHospitalId(user);
    return this.coordination.updateAvailability(hospitalId, body, user.sub);
  }

  async getReports(user: { hospitalId?: string }, startDate?: string, endDate?: string) {
    const hospitalId = this.resolveHospitalId(user);
    return this.coordination.getAnalytics({ hospitalId, startDate, endDate });
  }
}
