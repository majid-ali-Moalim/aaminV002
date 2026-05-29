import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import {
  EmergencyRequestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { TrackingService } from '../tracking/tracking.service';
import { AuditLogService } from '../tracking/audit-log.service';

@Injectable()
export class EmergencyRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private trackingGateway: TrackingGateway,
    private trackingService: TrackingService,
    private auditLog: AuditLogService
  ) {}

  async create(data: any) {
    try {
      // Robust Recursion: Sanitize only non-null objects
      const sanitize = (obj: any) => {
        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            if (obj[key] === '') {
              obj[key] = null;
            } else if (obj[key] !== null && typeof obj[key] === 'object') {
              sanitize(obj[key]);
            }
          });
        }
      };
      sanitize(data);

      let patientId = data.patientId;

      // Handle Inline Patient Creation (nested)
      if (data.newPatient) {
        // Check existing by phone
        const existingPatient = await this.prisma.patient.findFirst({
          where: { phone: String(data.newPatient.phone) }
        });

        if (existingPatient) {
          patientId = existingPatient.id;
        } else {
          // Create new user & patient
          const count = await this.prisma.patient.count();
          const patientCode = `PAT-${String(count + 1).padStart(4, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          
          const bcrypt = require('bcrypt');
          const uniqueSuffix = Date.now().toString().slice(-6);
          const emailOrUniq = `pat-${uniqueSuffix}-${Math.floor(Math.random() * 1000)}@aamin.so`; 
          const username = data.newPatient.phone ? String(data.newPatient.phone) : emailOrUniq;
          
          const existingUser = await this.prisma.user.findFirst({
            where: { OR: [{ username }, { email: emailOrUniq }] }
          });

          let userId;
          if (existingUser) {
            userId = existingUser.id;
          } else {
            const passwordHash = await bcrypt.hash('patient123', 10);
            const newUser = await this.prisma.user.create({
              data: { username, email: emailOrUniq, passwordHash, role: 'PATIENT' }
            });
            userId = newUser.id;
          }

          // Whitelist Patient Fields
          // Compute age from dateOfBirth if provided, otherwise use raw age
          let resolvedAge: number | null = null;
          let resolvedDob: Date | null = null;

          if (data.newPatient.dateOfBirth) {
            resolvedDob = new Date(data.newPatient.dateOfBirth);
            if (!isNaN(resolvedDob.getTime())) {
              resolvedAge = new Date().getFullYear() - resolvedDob.getFullYear();
            }
          } else if (data.newPatient.age) {
            resolvedAge = parseInt(String(data.newPatient.age), 10);
            // Derive approximate DOB as Jan 1 of (currentYear - age)
            const birthYear = new Date().getFullYear() - resolvedAge;
            resolvedDob = new Date(`${birthYear}-01-01T00:00:00.000Z`);
          }

          const newPatRow = await this.prisma.patient.create({
            data: {
              userId,
              patientCode,
              fullName: String(data.newPatient.fullName),
              age: resolvedAge,
              dateOfBirth: resolvedDob,
              gender: data.newPatient.gender || null,
              bloodType: this.mapBloodType(data.newPatient.bloodType) as any || null,
              phone: String(data.newPatient.phone),
              alternatePhone: data.newPatient.alternatePhone || null,
              nationalityType: data.newPatient.nationalityType || 'LOCAL',
              country: data.newPatient.country || (data.newPatient.nationalityType === 'INTERNATIONAL' ? null : 'Somalia'),
              maritalStatus: data.newPatient.maritalStatus || 'UNKNOWN',
              address: "Self-Registered Dispatch",
            }
          });
          patientId = newPatRow.id;
        }
      }

      if (!patientId) {
        throw new BadRequestException('A valid Patient ID or New Patient data is required for dispatch.');
      }

      // STRICT WHITELIST for EmergencyRequest
      // This prevents Prisma 'Invalid invocation' errors from unknown frontend fields
      // ISOLATION TEST: Bare minimum fields to find the bug
      const finalPayload: any = {
        trackingCode: data.trackingCode || await this.generateTrackingCode(),
        priority: data.priority || 'MEDIUM',
        requestSource: data.requestSource || 'PHONE_CALL',
        pickupLocation: String(data.pickupLocation),
        // Relations
        patient: { connect: { id: patientId } },
      };
      
      // Optional fields added one by one with safe checks
      if (data.incidentCategoryId) finalPayload.incidentCategory = { connect: { id: data.incidentCategoryId } };
      if (data.regionId) finalPayload.region = { connect: { id: data.regionId } };
      if (data.districtId) finalPayload.district = { connect: { id: data.districtId } };
      if (data.destinationHospitalId) finalPayload.destinationHospital = { connect: { id: data.destinationHospitalId } };

      // Add optional string fields
      const optionalStrings = [
        'destination', 'callerName', 'callerPhone', 'symptoms',
        'pickupLandmark', 'destinationLandmark', 'patientCondition',
        'consciousStatus', 'breathingStatus', 'bleedingStatus',
        'notes', 'manualDispatchNotes'
      ];
      optionalStrings.forEach(field => {
        if (data[field]) finalPayload[field] = String(data[field]);
      });

      // Add boolean flags
      if (data.needsOxygen !== undefined) finalPayload.needsOxygen = Boolean(data.needsOxygen);
      if (data.needsStretcher !== undefined) finalPayload.needsStretcher = Boolean(data.needsStretcher);

      // Add Dispatch Assignment if provided
      let isAssigned = false;
      if (data.ambulanceId) { finalPayload.ambulance = { connect: { id: data.ambulanceId } }; isAssigned = true; }
      if (data.driverId) { finalPayload.driver = { connect: { id: data.driverId } }; isAssigned = true; }
      if (data.nurseId) { finalPayload.nurse = { connect: { id: data.nurseId } }; isAssigned = true; }

      if (isAssigned) {
        finalPayload.status = 'ASSIGNED';
        finalPayload.assignedAt = new Date();
      }

      console.log('DIAGNOSTIC - Sending to Prisma:', JSON.stringify(finalPayload, null, 2));

      const request = await this.prisma.emergencyRequest.create({
        data: finalPayload,
        include: { patient: true, driver: true, nurse: true }
      });

      await this.notifications.create({
        title: 'New Emergency Request',
        message: `Request ${request.trackingCode} created for patient ${request.patient.fullName} at ${request.pickupLocation}`,
        type: 'EMERGENCY',
        priority: request.priority as any,
        relatedModule: 'EmergencyRequest',
        relatedId: request.id,
        actionUrl: `/admin/emergency-requests?id=${request.id}`
      });

      if (request.driver?.userId) {
        await this.notifications.create({
          title: 'New Emergency Assignment',
          message: `You have been assigned as Driver to request ${request.trackingCode}. Please prepare for dispatch.`,
          type: 'EMERGENCY',
          priority: request.priority as any,
          userId: request.driver.userId,
          relatedModule: 'EmergencyRequest',
          relatedId: request.id,
        });
      }

      if (request.nurse?.userId) {
        await this.notifications.create({
          title: 'New Emergency Assignment',
          message: `You have been assigned as Nurse to request ${request.trackingCode}. Please prepare for clinical support.`,
          type: 'EMERGENCY',
          priority: request.priority as any,
          userId: request.nurse.userId,
          relatedModule: 'EmergencyRequest',
          relatedId: request.id,
        });
      }

      return request;
    } catch (error: any) {
      console.error('STRICT DISPATCH ERROR:', error);
      let detail = error.message;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        detail = `Prisma Error ${error.code}: ${error.message} - Target: ${JSON.stringify(error.meta)}`;
      }
      throw new BadRequestException(detail || 'Severe error during emergency dispatch.');
    }
  }

  findAll() {
    return this.prisma.emergencyRequest.findMany({
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        dispatcher: {
          include: {
            user: true,
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
        nurse: {
          include: {
            user: true,
          },
        },
        ambulance: true,
        region: true,
        district: true,
        destinationHospital: true,
        incidentCategory: true,
        referrals: true,
        statusLogs: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.emergencyRequest.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        dispatcher: {
          include: {
            user: true,
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
        ambulance: true,
        nurse: {
          include: {
            user: true,
          },
        },
        region: true,
        district: true,
        destinationHospital: true,
        incidentCategory: true,
        referrals: true,
        statusLogs: {
          orderBy: { createdAt: 'desc' }
        }
      },
    });
  }

  async findByTrackingCode(trackingCode: string) {
    const emergencyRequest = await this.prisma.emergencyRequest.findUnique({
      where: { trackingCode },
      include: {
        patient: true,
        dispatcher: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        ambulance: {
          include: {
            station: true,
            equipmentLevel: true,
          }
        },
        nurse: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        region: true,
        district: true,
        destinationHospital: true,
        incidentCategory: true,
        statusLogs: {
          orderBy: { createdAt: 'desc' }
        },
        referrals: true,
      },
    });

    if (!emergencyRequest) {
      throw new NotFoundException('Emergency request not found');
    }

    return emergencyRequest;
  }

  async assign(
    id: string,
    data: {
      dispatcherId?: string;
      driverId?: string;
      nurseId?: string;
      ambulanceId?: string;
      status?: EmergencyRequestStatus;
    },
  ) {
    const existing = await this.prisma.emergencyRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emergency request not found');

    // Logic: Prevent assigning a driver/ambulance already on another active request
    const activeStatuses = ['ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'];
    
    if (data.driverId) {
      const busyDriver = await this.prisma.emergencyRequest.findFirst({
        where: { 
          driverId: data.driverId, 
          status: { in: activeStatuses as any },
          id: { not: id } 
        }
      });
      if (busyDriver) throw new ConflictException('Driver is already assigned to another active emergency');
    }

    if (data.ambulanceId) {
      const busyAmbulance = await this.prisma.emergencyRequest.findFirst({
        where: { 
          ambulanceId: data.ambulanceId, 
          status: { in: activeStatuses as any },
          id: { not: id } 
        }
      });
      if (busyAmbulance) throw new ConflictException('Ambulance is already assigned to another active emergency');
    }

    if (data.driverId === '') delete data.driverId;
    if (data.ambulanceId === '') delete data.ambulanceId;
    if (data.nurseId === '') delete data.nurseId;

    const newStatus = data.status || 'ASSIGNED';
    const updateData: any = { ...data, status: newStatus, assignedAt: new Date() };

    const result = await this.prisma.emergencyRequest.update({
      where: { id },
      data: {
        ...updateData,
        statusLogs: {
          create: {
            fromStatus: existing.status,
            toStatus: newStatus,
            notes: `Team assigned`,
          }
        }
      },
      include: {
        patient: true,
        dispatcher: true,
        driver: { include: { user: true } },
        nurse: { include: { user: true } },
        ambulance: true,
        statusLogs: true
      },
    });

    await this.notifications.create({
      title: 'Emergency Team Assigned',
      message: `Ambulance ${result.ambulance?.ambulanceNumber} and team assigned to ${result.trackingCode}`,
      type: 'EMERGENCY',
      priority: result.priority as any,
      relatedModule: 'EmergencyRequest',
      relatedId: result.id,
      actionUrl: `/admin/emergency-requests?id=${result.id}`,
    });

    if (result.driver?.userId) {
      await this.notifications.create({
        title: 'New Emergency Assignment',
        message: `You have been assigned as Driver to request ${result.trackingCode}. Please prepare for dispatch.`,
        type: 'EMERGENCY',
        priority: result.priority as any,
        userId: result.driver.userId,
        relatedModule: 'EmergencyRequest',
        relatedId: result.id,
      });
    }

    if (result.nurse?.userId) {
      await this.notifications.create({
        title: 'New Emergency Assignment',
        message: `You have been assigned as Nurse to request ${result.trackingCode}. Please prepare for clinical support.`,
        type: 'EMERGENCY',
        priority: result.priority as any,
        userId: result.nurse.userId,
        relatedModule: 'EmergencyRequest',
        relatedId: result.id,
      });
    }

    // Emit real-time tracking update
    const trackingData = await this.trackingService.findByCodeOrPhone(result.trackingCode);
    this.trackingGateway.emitTrackingUpdate(result.trackingCode, trackingData);

    // Audit log
    await this.auditLog.logCaseActivity(
      data.dispatcherId || 'SYSTEM', 
      'ASSIGNED_TEAM', 
      result.id, 
      existing.status, 
      newStatus,
      {
        driverId: data.driverId,
        nurseId: data.nurseId,
        ambulanceId: data.ambulanceId
      }
    );

    return result;
  }

  async updateStatus(id: string, status: EmergencyRequestStatus, employeeId?: string) {
    const existing = await this.prisma.emergencyRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emergency request not found');

    const updateData: any = { status };
    if (status === 'DISPATCHED') updateData.dispatchedAt = new Date();
    else if (status === 'ARRIVED_SCENE') updateData.arrivedAtSceneAt = new Date();
    else if (status === 'TRANSPORTING') updateData.departedSceneAt = new Date();
    else if (status === 'ARRIVED_HOSPITAL') updateData.arrivedDestinationAt = new Date();
    else if (status === 'COMPLETED') updateData.completedAt = new Date();
    else if (status === 'CANCELLED') updateData.cancelledAt = new Date();

    const updated = await this.prisma.emergencyRequest.update({
      where: { id },
      data: {
        ...updateData,
        statusLogs: {
          create: {
            fromStatus: existing.status,
            toStatus: status,
            changedByEmployeeId: employeeId,
            notes: `Status changed to ${status}`,
          }
        }
      },
      include: {
        statusLogs: true,
        patient: true,
      }
    });

    await this.notifications.create({
      title: 'Emergency Status Update',
      message: `Request ${existing.trackingCode} status changed to ${status}`,
      type: 'EMERGENCY',
      priority: existing.priority as any,
      relatedModule: 'EmergencyRequest',
      relatedId: existing.id,
      actionUrl: `/admin/emergency-requests?id=${existing.id}`
    });

    if (status === 'COMPLETED') {
      await this.notifications.broadcast({
        title: 'Emergency Completed',
        message: `Emergency response ${existing.trackingCode} is successfully completed.`,
        type: 'EMERGENCY',
        priority: 'MEDIUM',
        targetRole: 'ADMIN',
        relatedModule: 'EmergencyRequest',
        relatedId: existing.id,
      });
    }

    // Emit real-time tracking update
    const trackingData = await this.trackingService.findByCodeOrPhone(existing.trackingCode);
    this.trackingGateway.emitTrackingUpdate(existing.trackingCode, trackingData);

    // Audit log
    await this.auditLog.logCaseActivity(
      employeeId || 'SYSTEM',
      'STATUS_UPDATED',
      existing.id,
      existing.status,
      status
    );

    return updated;
  }

  async cancelRequest(id: string, reason: string, employeeId?: string) {
    const existing = await this.prisma.emergencyRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emergency request not found');

    const updated = await this.prisma.emergencyRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        statusLogs: {
          create: {
            fromStatus: existing.status,
            toStatus: 'CANCELLED',
            changedByEmployeeId: employeeId,
            notes: `Request cancelled. Reason: ${reason}`,
          }
        }
      },
      include: {
        statusLogs: true,
        patient: true,
      }
    });

    await this.notifications.create({
      title: 'Emergency Cancelled',
      message: `Request ${existing.trackingCode} was cancelled. Reason: ${reason}`,
      type: 'EMERGENCY',
      priority: existing.priority as any,
      relatedModule: 'EmergencyRequest',
      relatedId: existing.id,
      actionUrl: `/admin/emergency-requests?id=${existing.id}`
    });

    // Emit real-time tracking update
    const trackingData = await this.trackingService.findByCodeOrPhone(existing.trackingCode);
    this.trackingGateway.emitTrackingUpdate(existing.trackingCode, trackingData);

    // Audit log
    await this.auditLog.logCaseActivity(
      employeeId || 'SYSTEM',
      'STATUS_UPDATED',
      existing.id,
      existing.status,
      'CANCELLED'
    );

    return updated;
  }

  async markFailed(id: string, reason: string, employeeId?: string) {
    const existing = await this.prisma.emergencyRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emergency request not found');

    const updated = await this.prisma.emergencyRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED', // A "failed" dispatch might be classified as cancelled or closed in the DB
        statusLogs: {
          create: {
            fromStatus: existing.status,
            toStatus: 'CANCELLED',
            changedByEmployeeId: employeeId,
            notes: `Mission Failed. Reason: ${reason}`,
          }
        }
      },
      include: {
        statusLogs: true,
        patient: true,
      }
    });

    await this.notifications.create({
      title: 'Emergency Failed',
      message: `Request ${existing.trackingCode} failed. Reason: ${reason}`,
      type: 'EMERGENCY',
      priority: 'CRITICAL',
      relatedModule: 'EmergencyRequest',
      relatedId: existing.id,
      actionUrl: `/admin/emergency-requests?id=${existing.id}`
    });

    return updated;
  }

  async escalateRequest(id: string, reason?: string, employeeId?: string) {
    const existing = await this.prisma.emergencyRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emergency request not found');

    const updated = await this.prisma.emergencyRequest.update({
      where: { id },
      data: {
        priority: 'CRITICAL',
        statusLogs: {
          create: {
            fromStatus: existing.status,
            toStatus: existing.status,
            changedByEmployeeId: employeeId,
            notes: `Request ESCALATED to CRITICAL. ${reason ? `Reason: ${reason}` : ''}`,
          }
        }
      },
      include: {
        statusLogs: true,
        patient: true,
      }
    });

    await this.notifications.create({
      title: 'Emergency ESCALATED',
      message: `Request ${existing.trackingCode} was escalated to CRITICAL priority.`,
      type: 'EMERGENCY',
      priority: 'CRITICAL',
      relatedModule: 'EmergencyRequest',
      relatedId: existing.id,
      actionUrl: `/admin/emergency-requests?id=${existing.id}`
    });

    return updated;
  }

  update(id: string, data: Prisma.EmergencyRequestUpdateInput) {
    return this.prisma.emergencyRequest.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.emergencyRequest.delete({
      where: { id },
    });
  }

  private async generateTrackingCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.emergencyRequest.count();
    const sequence = String(count + 1).padStart(4, '0');
    return `CASE-${year}-${sequence}`;
  }

  private mapBloodType(type: string): string | null {
    if (!type) return null;
    const mapping: Record<string, string> = {
      'A+': 'A_POSITIVE',
      'A-': 'A_NEGATIVE',
      'B+': 'B_POSITIVE',
      'B-': 'B_NEGATIVE',
      'AB+': 'AB_POSITIVE',
      'AB-': 'AB_NEGATIVE',
      'O+': 'O_POSITIVE',
      'O-': 'O_NEGATIVE',
    };
    return mapping[type] || null;
  }

  async getAvailableAmbulances() {
    // Only get ambulances that are marked as AVAILABLE and NOT currently on a mission
    const activeStatuses = ['ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'];
    
    const busyAmbulanceIds = (await this.prisma.emergencyRequest.findMany({
      where: { status: { in: activeStatuses as any } },
      select: { ambulanceId: true }
    })).map(r => r.ambulanceId).filter(Boolean);

    return this.prisma.ambulance.findMany({
      where: {
        status: 'AVAILABLE',
        id: { notIn: busyAmbulanceIds as string[] }
      },
    });
  }

  async getAvailableDrivers() {
    const driverRole = await this.prisma.employeeRole.findFirst({
      where: { name: { contains: 'Driver', mode: 'insensitive' } }
    });
    
    if (!driverRole) return [];

    const activeStatuses = ['ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'];
    
    // Find drivers currently on a mission
    const busyDriverIds = (await this.prisma.emergencyRequest.findMany({
      where: { status: { in: activeStatuses as any } },
      select: { driverId: true }
    })).map(r => r.driverId).filter(Boolean);

    return this.prisma.employee.findMany({
      where: {
        employeeRoleId: driverRole.id,
        status: 'ACTIVE',
        id: { notIn: busyDriverIds as string[] }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        employeeRole: true,
        assignedAmbulance: true,
      },
    });
  }

  async getAvailableNurses() {
    const nurseRole = await this.prisma.employeeRole.findFirst({
      where: { name: { contains: 'Nurse', mode: 'insensitive' } }
    });
    
    if (!nurseRole) return [];

    const activeStatuses = ['ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'];
    
    // Find nurses currently on a mission
    const busyNurseIds = (await this.prisma.emergencyRequest.findMany({
      where: { status: { in: activeStatuses as any } },
      select: { nurseId: true }
    })).map(r => r.nurseId).filter(Boolean);

    return this.prisma.employee.findMany({
      where: {
        employeeRoleId: nurseRole.id,
        status: 'ACTIVE',
        id: { notIn: busyNurseIds as string[] }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        employeeRole: true,
        assignedAmbulance: true,
      },
    });
  }
  async getDashboardStats() {
    const total = await this.prisma.emergencyRequest.count();
    const pending = await this.prisma.emergencyRequest.count({
      where: { status: 'PENDING' },
    });
    const assigned = await this.prisma.emergencyRequest.count({
      where: { status: 'ASSIGNED' },
    });
    const completed = await this.prisma.emergencyRequest.count({
      where: { status: 'COMPLETED' },
    });

    return {
      total,
      pending,
      assigned,
      completed,
    };
  }
}
