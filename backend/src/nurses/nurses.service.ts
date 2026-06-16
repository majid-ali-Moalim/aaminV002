import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NursesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService
  ) {}

  async findAll(filters?: { 
    stationId?: string; 
    status?: string; 
    shiftStatus?: string;
    searchTerm?: string;
  }) {
    const where: Prisma.EmployeeWhereInput = {
      employeeRole: {
        name: 'Nurse',
      },
    };

    if (filters?.stationId) {
      where.stationId = filters.stationId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.shiftStatus) {
      where.shiftStatus = filters.shiftStatus;
    }

    if (filters?.searchTerm) {
      where.OR = [
        { firstName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { lastName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { employeeCode: { contains: filters.searchTerm, mode: 'insensitive' } },
        { phone: { contains: filters.searchTerm, mode: 'insensitive' } },
        { specialization: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      include: {
        user: true,
        employeeRole: true,
        department: true,
        station: true,
        assignedAmbulance: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
        employeeRole: true,
        department: true,
        station: true,
        assignedAmbulance: true,
        shiftRecords: {
          take: 10,
          orderBy: { startTime: 'desc' },
        },
        attendanceRecords: {
          take: 10,
          orderBy: { date: 'desc' },
        }
      },
    });
  }

  async getStats() {
    const nurses = await this.prisma.employee.findMany({
      where: {
        employeeRole: { name: 'Nurse' },
      },
      include: {
        nurseRequests: true,
        patientCareRecords: true,
        incidentReports: true,
      }
    });

    const total = nurses.length;
    const available = nurses.filter(n => n.shiftStatus === 'AVAILABLE').length;
    const onDuty = nurses.filter(n => n.shiftStatus === 'ON_DUTY' || n.shiftStatus === 'TRANSPORTING').length;
    const pendingClearance = nurses.filter(n => n.medicalClearanceStatus === 'PENDING').length;

    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const expiringLicenses = nurses.filter(
      (n) => n.licenseExpiryDate && n.licenseExpiryDate > now && n.licenseExpiryDate <= in30Days
    ).length;
    
    // Performance metrics
    const totalCases = nurses.reduce((acc, n) => acc + n.nurseRequests.length, 0);
    const totalRecords = nurses.reduce((acc, n) => acc + n.patientCareRecords.length, 0);
    const totalIncidents = nurses.reduce((acc, n) => acc + n.incidentReports.length, 0);

    return {
      total,
      available,
      onDuty,
      pendingClearance,
      expiringLicenses,
      totalCases,
      totalRecords,
      totalIncidents,
      criticalIncidents: nurses.reduce((acc, n) => acc + n.incidentReports.filter(i => i.priority === 'CRITICAL').length, 0),
    };
  }

  async getAssignments() {
    return this.prisma.employee.findMany({
      where: {
        employeeRole: { name: 'Nurse' },
        assignedAmbulanceId: { not: null },
      },
      include: {
        assignedAmbulance: true,
        station: true,
      },
    });
  }

  async getPerformance(id: string) {
    const nurse = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        nurseRequests: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { patient: true, incidentCategory: true }
        },
        patientCareRecords: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        incidentReports: true,
      }
    });

    if (!nurse) return null;

    return {
      name: `${nurse.firstName} ${nurse.lastName}`,
      metrics: {
        casesHandled: nurse.nurseRequests.length,
        reportsFiled: nurse.patientCareRecords.length,
        incidents: nurse.incidentReports.length,
        clearance: nurse.medicalClearanceStatus,
      },
      recentActivity: nurse.nurseRequests.map(r => ({
        id: r.id,
        code: r.trackingCode,
        patient: r.patient.fullName,
        type: r.incidentCategory?.name,
        date: r.createdAt,
      }))
    };
  }

  async getPatientCareRecords(nurseId?: string) {
    return this.prisma.patientCareRecord.findMany({
      where: nurseId ? { nurseId } : undefined,
      include: {
        emergencyRequest: true,
        nurse: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIncidentReports(nurseId?: string) {
    return this.prisma.incidentReport.findMany({
      where: nurseId ? { nurseId } : undefined,
      include: {
        emergencyRequest: true,
        nurse: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPatientCareRecord(data: any) {
    const result = await this.prisma.patientCareRecord.create({
      data: {
        emergencyRequest: { connect: { id: data.emergencyRequestId } },
        nurse: { connect: { id: data.nurseId } },
        patientId: data.patientId, // Required by schema
        bloodPressure: data.bloodPressure,
        heartRate: data.heartRate ? parseInt(data.heartRate) : null,
        oxygenSaturation: data.oxygenSaturation ? parseInt(data.oxygenSaturation) : null,
        temperature: data.temperature ? parseFloat(data.temperature) : null,
        respiratoryRate: data.respiratoryRate ? parseInt(data.respiratoryRate) : null,
        bloodSugar: data.bloodSugar ? parseFloat(data.bloodSugar) : null,
        clinicalNotes: data.clinicalNotes,
        medications: data.medications,
        treatmentGiven: data.treatmentGiven,
      },
      include: {
        emergencyRequest: true,
        nurse: true,
      },
    });

    await this.notifications.create({
      title: 'New Patient Care Record',
      message: `New clinical record added for patient in request ${result.emergencyRequest.trackingCode}`,
      type: 'PATIENT_CARE',
      priority: 'LOW',
      relatedModule: 'EmergencyRequest',
      relatedId: result.requestId,
      actionUrl: `/admin/emergency-requests?id=${result.requestId}`,
    });

    return result;
  }

  async createIncidentReport(data: any) {
    const result = await this.prisma.incidentReport.create({
      data: {
        emergencyRequest: { connect: { id: data.emergencyRequestId } },
        nurse: { connect: { id: data.nurseId } },
        category: data.category,
        priority: data.priority,
        description: data.description,
        actionsTaken: data.actionsTaken,
        status: data.status || 'PENDING',
        involvedStaff: data.involvedStaff || [],
      },
      include: {
        emergencyRequest: true,
        nurse: true,
      },
    });

    await this.notifications.create({
      title: 'Incident Report Created',
      message: `${result.priority} priority incident reported: ${result.category}`,
      type: 'EMERGENCY',
      priority: result.priority === 'CRITICAL' || result.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
      relatedModule: 'EmergencyRequest',
      relatedId: result.requestId,
      actionUrl: `/admin/emergency-requests?id=${result.requestId}`,
    });

    return result;
  }

  async updateShiftStatus(id: string, status: string, notes?: string) {
    // ... (rest of the existing shift logic is fine)
    // End current active shift if any
    if (status !== 'OFF_DUTY') {
      await this.prisma.shiftRecord.updateMany({
        where: {
          employeeId: id,
          endTime: null,
        },
        data: {
          endTime: new Date(),
        },
      });

      // Start new shift record
      await this.prisma.shiftRecord.create({
        data: {
          employeeId: id,
          status,
          notes,
        },
      });
    } else {
        await this.prisma.shiftRecord.updateMany({
            where: {
                employeeId: id,
                endTime: null,
            },
            data: {
                endTime: new Date(),
            },
        });
    }

    return this.prisma.employee.update({
      where: { id },
      data: { shiftStatus: status },
    });
  }

  async updateMedicalStatus(id: string, status: string) {
    return this.prisma.employee.update({
      where: { id },
      data: { medicalClearanceStatus: status },
    });
  }

  async assignAmbulance(id: string, ambulanceId: string | null) {
    return this.prisma.employee.update({
      where: { id },
      data: { assignedAmbulanceId: ambulanceId },
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
    shiftStatus: string,
    employmentStatus: string,
    hasActiveCase: boolean,
    medicalClearanceStatus?: string | null,
  ): 'available' | 'unavailable' {
    if (
      employmentStatus === 'ACTIVE' &&
      shiftStatus === 'AVAILABLE' &&
      !hasActiveCase &&
      medicalClearanceStatus !== 'PENDING'
    ) {
      return 'available';
    }
    return 'unavailable';
  }

  private getUnavailableReason(
    shiftStatus: string,
    employmentStatus: string,
    hasActiveCase: boolean,
    medicalClearanceStatus?: string | null,
  ): string | null {
    if (hasActiveCase) return 'On case';
    if (medicalClearanceStatus === 'PENDING') return 'Pending clearance';
    if (employmentStatus !== 'ACTIVE') return 'Inactive';
    switch (shiftStatus) {
      case 'ON_DUTY':
      case 'TRANSPORTING':
        return 'On duty';
      case 'ON_BREAK':
        return 'On break';
      case 'UNAVAILABLE':
        return 'Unavailable';
      case 'OFF_DUTY':
        return 'Off duty';
      default:
        return shiftStatus !== 'AVAILABLE' ? shiftStatus.replace(/_/g, ' ') : null;
    }
  }

  async getAvailabilityOverview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [nurses, activeCases, todayCases, monthCases, recentShifts] =
      await Promise.all([
        this.prisma.employee.findMany({
          where: { employeeRole: { name: { equals: 'Nurse', mode: 'insensitive' } } },
          include: {
            user: { select: { username: true, email: true } },
            employeeRole: true,
            station: { include: { region: true, district: true } },
            assignedAmbulance: { select: { id: true, ambulanceNumber: true, plateNumber: true } },
            nurseRequests: {
              where: { status: { in: [...this.ACTIVE_CASE_STATUSES] } },
              select: {
                id: true,
                trackingCode: true,
                status: true,
                updatedAt: true,
                patient: { select: { fullName: true } },
              },
              take: 1,
              orderBy: { updatedAt: 'desc' },
            },
          },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        }),
        this.prisma.emergencyRequest.findMany({
          where: {
            nurseId: { not: null },
            status: { in: [...this.ACTIVE_CASE_STATUSES] },
          },
          select: {
            id: true,
            trackingCode: true,
            nurseId: true,
            status: true,
            updatedAt: true,
            patient: { select: { fullName: true } },
          },
        }),
        this.prisma.emergencyRequest.findMany({
          where: { createdAt: { gte: todayStart }, nurseId: { not: null } },
          select: { nurseId: true },
        }),
        this.prisma.emergencyRequest.findMany({
          where: { createdAt: { gte: monthAgo }, nurseId: { not: null } },
          select: { nurseId: true, createdAt: true },
        }),
        this.prisma.shiftRecord.findMany({
          where: {
            employee: { employeeRole: { name: { equals: 'Nurse', mode: 'insensitive' } } },
            startTime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          take: 25,
          orderBy: { startTime: 'desc' },
          include: {
            employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          },
        }),
      ]);

    const activeCaseByNurse = new Map(activeCases.map((c) => [c.nurseId!, c]));

    const rows = nurses.map((nurse) => {
      const activeCase =
        nurse.nurseRequests?.[0] ?? activeCaseByNurse.get(nurse.id) ?? null;
      const operationalStatus = this.resolveOperationalStatus(
        nurse.shiftStatus,
        nurse.status,
        !!activeCase,
        nurse.medicalClearanceStatus,
      );
      const unavailableReason =
        operationalStatus === 'unavailable'
          ? this.getUnavailableReason(
              nurse.shiftStatus,
              nurse.status,
              !!activeCase,
              nurse.medicalClearanceStatus,
            )
          : null;

      return {
        id: nurse.id,
        employeeCode: nurse.employeeCode,
        firstName: nurse.firstName,
        lastName: nurse.lastName,
        fullName: [nurse.firstName, nurse.lastName].filter(Boolean).join(' ') || 'Unknown',
        phone: nurse.phone,
        specialization: nurse.specialization,
        shiftStatus: nurse.shiftStatus,
        employmentStatus: nurse.status,
        medicalClearanceStatus: nurse.medicalClearanceStatus,
        operationalStatus,
        unavailableReason,
        assignedAmbulance: nurse.assignedAmbulance
          ? {
              id: nurse.assignedAmbulance.id,
              ambulanceNumber: nurse.assignedAmbulance.ambulanceNumber,
              plateNumber: nurse.assignedAmbulance.plateNumber,
            }
          : null,
        station: nurse.station ? { id: nurse.station.id, name: nurse.station.name } : null,
        region: nurse.station?.region
          ? { id: nurse.station.region.id, name: nurse.station.region.name }
          : null,
        district: nurse.station?.district
          ? { id: nurse.station.district.id, name: nurse.station.district.name }
          : null,
        licenseStatus: nurse.licenseStatus,
        licenseExpiryDate: nurse.licenseExpiryDate?.toISOString() ?? null,
        currentCase: activeCase
          ? {
              id: activeCase.id,
              trackingCode: activeCase.trackingCode,
              status: activeCase.status,
              patientName: (activeCase as any).patient?.fullName ?? null,
            }
          : null,
        updatedAt: nurse.updatedAt.toISOString(),
      };
    });

    const summary = {
      total: rows.length,
      available: rows.filter((r) => r.operationalStatus === 'available').length,
      unavailable: rows.filter((r) => r.operationalStatus === 'unavailable').length,
      activeToday: new Set(todayCases.map((c) => c.nurseId).filter(Boolean)).size,
    };

    const statusCounts = {
      available: summary.available,
      unavailable: summary.unavailable,
    };

    const recentChanges = recentShifts.map((shift) => ({
      id: shift.id,
      activity: `${[shift.employee.firstName, shift.employee.lastName].filter(Boolean).join(' ') || shift.employee.employeeCode || 'Nurse'} — ${shift.status.replace(/_/g, ' ')}`,
      actorName: 'System',
      createdAt: shift.startTime.toISOString(),
      nurseId: shift.employeeId,
    }));

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

    const casesPerNurseMap = new Map<string, number>();
    for (const c of monthCases) {
      if (!c.nurseId) continue;
      casesPerNurseMap.set(c.nurseId, (casesPerNurseMap.get(c.nurseId) ?? 0) + 1);
    }

    const nurseNameById = new Map(
      nurses.map((n) => [
        n.id,
        [n.firstName, n.lastName].filter(Boolean).join(' ') || n.employeeCode || n.id.slice(0, 8),
      ]),
    );

    const analytics = {
      dailyUsage: Array.from(dailyUsageMap.entries()).map(([date, count]) => ({
        date,
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        count,
      })),
      casesPerNurse: Array.from(casesPerNurseMap.entries())
        .map(([id, count]) => ({
          nurseName: nurseNameById.get(id) ?? id.slice(0, 8),
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      statusDistribution: [
        { name: 'Available', value: statusCounts.available, color: '#10B981' },
        { name: 'Unavailable', value: statusCounts.unavailable, color: '#EF4444' },
      ],
      activityTrend: Array.from(dailyUsageMap.entries()).map(([date, active]) => ({
        date,
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        active,
      })),
    };

    const stations = [...new Map(rows.filter((r) => r.station).map((r) => [r.station!.id, r.station!])).values()];
    const regions = [...new Map(rows.filter((r) => r.region).map((r) => [r.region!.id, r.region!])).values()];
    const districts = [...new Map(rows.filter((r) => r.district).map((r) => [r.district!.id, r.district!])).values()];
    const specializations = [...new Set(rows.map((r) => r.specialization).filter(Boolean))].sort() as string[];

    const liveBoard = {
      available: rows.filter((r) => r.operationalStatus === 'available'),
      unavailable: rows.filter((r) => r.operationalStatus === 'unavailable'),
      recentlyUpdated: [...rows]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8),
    };

    return {
      summary,
      statusCounts,
      nurses: rows,
      recentChanges,
      analytics,
      filters: { stations, regions, districts, specializations },
      liveBoard,
    };
  }

  async getAvailabilityDetail(id: string) {
    const nurse = await this.prisma.employee.findFirst({
      where: {
        id,
        employeeRole: { name: { equals: 'Nurse', mode: 'insensitive' } },
      },
      include: {
        user: { select: { username: true, email: true } },
        employeeRole: true,
        station: { include: { region: true, district: true } },
        assignedAmbulance: true,
        nurseRequests: {
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
            ambulance: { select: { ambulanceNumber: true } },
          },
        },
        shiftRecords: {
          take: 15,
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!nurse) throw new NotFoundException('Nurse not found');

    const activeCase = nurse.nurseRequests.find((r) =>
      this.ACTIVE_CASE_STATUSES.includes(r.status as any),
    );

    return {
      nurse: {
        id: nurse.id,
        employeeCode: nurse.employeeCode,
        firstName: nurse.firstName,
        lastName: nurse.lastName,
        phone: nurse.phone,
        specialization: nurse.specialization,
        shiftStatus: nurse.shiftStatus,
        employmentStatus: nurse.status,
        medicalClearanceStatus: nurse.medicalClearanceStatus,
        operationalStatus: this.resolveOperationalStatus(
          nurse.shiftStatus,
          nurse.status,
          !!activeCase,
          nurse.medicalClearanceStatus,
        ),
        unavailableReason:
          activeCase ||
          nurse.shiftStatus !== 'AVAILABLE' ||
          nurse.status !== 'ACTIVE' ||
          nurse.medicalClearanceStatus === 'PENDING'
            ? this.getUnavailableReason(
                nurse.shiftStatus,
                nurse.status,
                !!activeCase,
                nurse.medicalClearanceStatus,
              )
            : null,
        licenseStatus: nurse.licenseStatus,
        licenseExpiryDate: nurse.licenseExpiryDate?.toISOString() ?? null,
        station: nurse.station,
        region: nurse.station?.region ?? null,
        district: nurse.station?.district ?? null,
        updatedAt: nurse.updatedAt.toISOString(),
      },
      assignedAmbulance: nurse.assignedAmbulance,
      currentCase: activeCase ?? null,
      caseHistory: nurse.nurseRequests,
      shiftHistory: nurse.shiftRecords.map((s) => ({
        id: s.id,
        status: s.status,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime?.toISOString() ?? null,
        notes: s.notes,
      })),
    };
  }
}
