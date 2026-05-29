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
}
