import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  EmergencyRequestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { TrackingService } from '../tracking/tracking.service';
import { AuditLogService } from '../tracking/audit-log.service';
import {
  DispatcherScope,
  myCasesWhere,
  myActiveCasesWhere,
  regionalCasesWhere,
  regionalPendingCasesWhere,
  isCaseInDispatcherPendingScope,
  isCaseAtDispatcherStation,
} from '../dispatchers-app/dispatcher-scope.util';
import { StationCoverageService } from '../station-coverage/station-coverage.service';
import {
  assertDispatchEligibleStaff,
  filterDispatchEligibleEmployees,
  getPresentEmployeeIdsToday,
} from '../employee-attendance/dispatch-staff-eligibility';
import {
  ACTIVE_CASE_STATUSES,
  ASSIGNABLE_SHIFT_STATUSES,
} from '../common/active-case-statuses';

type AuthUser = {
  sub?: string;
  role?: string;
  employeeId?: string;
  employeeRole?: string;
};

function caseRequiresNurse(caseRow: {
  notes?: string | null;
  manualDispatchNotes?: string | null;
}): boolean {
  const blob = `${caseRow.notes ?? ''}\n${caseRow.manualDispatchNotes ?? ''}`.toUpperCase();
  return blob.includes('REQUIRES NURSE: YES') || blob.includes('NURSE REQUIRED');
}

type EmergencyQueue = 'pending' | 'my-active' | 'my-cases' | 'regional';

@Injectable()
export class EmergencyRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private trackingGateway: TrackingGateway,
    private trackingService: TrackingService,
    private auditLog: AuditLogService,
    private stationCoverage: StationCoverageService,
  ) {}

  private async teamUserIds(requestId: string): Promise<string[]> {
    const req = await this.prisma.emergencyRequest.findUnique({
      where: { id: requestId },
      include: { driver: true, nurse: true },
    });
    if (!req) return [];
    return [req.driver?.userId, req.nurse?.userId].filter(Boolean) as string[];
  }

  private isDispatcherUser(user?: AuthUser): boolean {
    return (
      user?.role === 'EMPLOYEE' &&
      String(user.employeeRole || '').toUpperCase().includes('DISPATCH')
    );
  }

  private async resolveDispatcherScope(
    userId: string,
  ): Promise<(DispatcherScope & { stationScoped: boolean }) | null> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        userId,
        employeeRole: { name: { contains: 'Dispatcher', mode: 'insensitive' } },
      },
      include: { station: { include: { region: true } } },
    });
    if (!employee) return null;
    const stationScoped = await this.stationCoverage.usesStationScoping();
    return {
      dispatcherId: employee.id,
      regionId: employee.station?.regionId ?? null,
      districtId: employee.station?.districtId ?? null,
      stationId: employee.stationId ?? null,
      regionName: employee.station?.region?.name ?? null,
      stationScoped,
    };
  }

  private async dispatcherWhereForQueue(
    user: AuthUser,
    queue?: string,
  ): Promise<Prisma.EmergencyRequestWhereInput> {
    const scope = await this.resolveDispatcherScope(user.sub!);
    if (!scope) {
      return { id: { in: [] } };
    }

    const q = (queue || 'regional') as EmergencyQueue;
    switch (q) {
      case 'pending':
        return regionalPendingCasesWhere(scope, {}, scope.stationScoped);
      case 'my-active':
        return myActiveCasesWhere(scope);
      case 'my-cases':
        return myCasesWhere(scope);
      case 'regional':
      default:
        return regionalCasesWhere(scope, {}, scope.stationScoped);
    }
  }

  async assertDispatcherCanAccessCase(
    user: AuthUser | undefined,
    caseRow: {
      id: string;
      dispatcherId: string | null;
      regionId: string | null;
      stationId: string | null;
      status: string;
    },
    action: 'read' | 'assign' | 'mutate' | 'transfer' = 'read',
  ) {
    if (!this.isDispatcherUser(user) || !user?.sub) return;

    const scope = await this.resolveDispatcherScope(user.sub);
    if (!scope) {
      throw new ForbiddenException('Dispatcher profile not found');
    }

    const isMine = caseRow.dispatcherId === scope.dispatcherId;
    const isRegionalPending = isCaseInDispatcherPendingScope(scope, caseRow, scope.stationScoped);
    const inStationScope = isCaseAtDispatcherStation(scope, caseRow, scope.stationScoped);

    if (!inStationScope) {
      throw new ForbiddenException('Case belongs to another station');
    }

    if (action === 'assign') {
      if (caseRow.dispatcherId && caseRow.dispatcherId !== scope.dispatcherId) {
        throw new ForbiddenException('This case is assigned to another dispatcher');
      }
      if (!isMine && !isRegionalPending) {
        throw new ForbiddenException('You can only assign cases in your station pending queue');
      }
      return;
    }

    if (action === 'transfer') {
      if (!isMine && !isRegionalPending) {
        throw new ForbiddenException('You can only transfer cases within your dispatch scope');
      }
      return;
    }

    if (action === 'mutate' && !isMine) {
      throw new ForbiddenException('You can only update cases assigned to you');
    }

    if (action === 'read') {
      return;
    }

    if (!isMine && !isRegionalPending) {
      throw new ForbiddenException('Case is outside your dispatch scope');
    }
  }

  private assertValidSomaliaPhone(value: string | undefined | null, label: string) {
    if (!value?.trim()) return;
    const digits = String(value).replace(/\D/g, '').replace(/^252/, '');
    if (!/^[67]\d{7,8}$/.test(digits)) {
      throw new BadRequestException(`Invalid Somali ${label}`);
    }
  }

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

      this.assertValidSomaliaPhone(data.callerPhone, 'phone number');
      if (data.newPatient?.phone) {
        this.assertValidSomaliaPhone(data.newPatient.phone, 'patient phone');
      }

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
              gender: this.mapGender(data.newPatient.gender),
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
        priority: data.priority || 'MEDIUM',
        requestSource: data.requestSource || 'PHONE_CALL',
        pickupLocation: String(data.pickupLocation),
        // Relations
        patient: { connect: { id: patientId } },
      };

      if (data.trackingCode) {
        finalPayload.trackingCode = data.trackingCode;
      }
      
      // Optional fields added one by one with safe checks
      if (data.incidentCategoryId) finalPayload.incidentCategory = { connect: { id: data.incidentCategoryId } };
      if (data.regionId) finalPayload.region = { connect: { id: data.regionId } };
      if (data.districtId) finalPayload.district = { connect: { id: data.districtId } };

      const stationRouting = await this.stationCoverage.resolveCaseStationRouting({
        districtId: data.districtId,
        regionId: data.regionId,
        submitterEmployeeId: data.submitterEmployeeId,
      });
      const resolvedStationId = stationRouting.stationId;
      const stationScoped = await this.stationCoverage.usesStationScoping();

      if (stationScoped && !resolvedStationId) {
        throw new BadRequestException(
          'No station covers the selected district. Configure station coverage or choose a covered district.',
        );
      }

      if (resolvedStationId) {
        finalPayload.station = { connect: { id: resolvedStationId } };
      }

      // Cases belong to the responsible station pending queue — no dispatcher owner at create.
      const autoRouteFromStationId = stationRouting.crossStationRoute
        ? stationRouting.submitterStationId
        : null;

      if (data.destinationHospitalId) finalPayload.destinationHospital = { connect: { id: data.destinationHospitalId } };
      if (data.destinationHospitalBranchId) finalPayload.destinationHospitalBranchId = String(data.destinationHospitalBranchId);
      if (data.destinationHospitalBranchName) finalPayload.destinationHospitalBranchName = String(data.destinationHospitalBranchName);

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

      const rawLat = data.pickupLatitude ?? data.latitude;
      const rawLng = data.pickupLongitude ?? data.longitude;
      if (rawLat != null && rawLng != null && rawLat !== '' && rawLng !== '') {
        const lat = parseFloat(String(rawLat));
        const lng = parseFloat(String(rawLng));
        if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          finalPayload.pickupLatitude = lat;
          finalPayload.pickupLongitude = lng;
        }
      }

      // Add Dispatch Assignment if provided
      let isAssigned = false;
      if (data.ambulanceId) { finalPayload.ambulance = { connect: { id: data.ambulanceId } }; isAssigned = true; }
      if (data.driverId) { finalPayload.driver = { connect: { id: data.driverId } }; isAssigned = true; }
      if (data.nurseId) { finalPayload.nurse = { connect: { id: data.nurseId } }; isAssigned = true; }

      if (isAssigned) {
        finalPayload.status = 'ASSIGNED';
        finalPayload.assignedAt = new Date();
      } else {
        finalPayload.status = 'PENDING';
      }

      const autoRouteMeta = {
        fromStationId: autoRouteFromStationId,
        stationName: stationRouting.stationName,
        crossStationRoute: stationRouting.crossStationRoute,
      };

      let request:
        | (Awaited<ReturnType<typeof this.prisma.emergencyRequest.create>> & {
            patient: { fullName: string };
            driver: { userId: string } | null;
            nurse: { userId: string } | null;
          })
        | undefined;
      const maxAttempts = data.trackingCode ? 1 : 5;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (!data.trackingCode) {
          finalPayload.trackingCode = await this.generateTrackingCode();
        }
        try {
          request = await this.prisma.emergencyRequest.create({
            data: finalPayload,
            include: {
              patient: true,
              driver: true,
              nurse: true,
              station: { select: { id: true, name: true } },
            },
          });
          break;
        } catch (createError: any) {
          const isDuplicateCode =
            createError instanceof Prisma.PrismaClientKnownRequestError &&
            createError.code === 'P2002' &&
            JSON.stringify(createError.meta?.target ?? '').includes('trackingCode');
          if (isDuplicateCode && !data.trackingCode && attempt < maxAttempts - 1) {
            continue;
          }
          throw createError;
        }
      }

      if (!request) {
        throw new BadRequestException('Could not generate a unique tracking code. Please try again.');
      }

      if (
        autoRouteMeta.crossStationRoute &&
        autoRouteMeta.fromStationId &&
        resolvedStationId
      ) {
        const transferredById = data.submitterEmployeeId;
        if (transferredById) {
          await this.prisma.emergencyCaseTransfer.create({
            data: {
              emergencyRequestId: request.id,
              fromStationId: autoRouteMeta.fromStationId,
              toStationId: resolvedStationId,
              reason: 'Auto-routed to covering station based on patient district',
              transferredById,
            },
          });
        }
      }

      const assignedAtCreate = [request.driver?.userId, request.nurse?.userId].filter(Boolean) as string[];

      const stationLabel = autoRouteMeta.stationName || 'the responsible station';
      await this.notifications.dispatchEvent({
        eventKey: 'EMERGENCY_CREATED',
        title: 'New emergency request assigned to your station',
        message: `Case ${request.trackingCode} for ${request.patient.fullName} at ${request.pickupLocation} is waiting in the ${stationLabel} pending queue.`,
        type: 'EMERGENCY',
        category: 'MISSION',
        priority: request.priority as any,
        entityType: 'EmergencyRequest',
        entityId: request.id,
        redirectUrl: `/dispatcher/emergency-requests/pending`,
        context: {
          createdById: data.createdByUserId ?? data.dispatcherUserId,
          regionId: request.regionId ?? data.regionId ?? null,
          stationId: request.stationId ?? resolvedStationId ?? null,
          assignedUserIds: assignedAtCreate.length ? assignedAtCreate : undefined,
          includeEmployeeRoles: assignedAtCreate.length ? ['Driver', 'Nurse'] : undefined,
          directOnly: false,
        },
      });

      return {
        ...request,
        routing: {
          stationId: resolvedStationId,
          stationName: autoRouteMeta.stationName,
          crossStationRoute: autoRouteMeta.crossStationRoute,
          submitterCanAccess: !autoRouteMeta.crossStationRoute,
        },
      };
    } catch (error: any) {
      console.error('STRICT DISPATCH ERROR:', error);
      let detail = error.message;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        detail = `Prisma Error ${error.code}: ${error.message} - Target: ${JSON.stringify(error.meta)}`;
      }
      throw new BadRequestException(detail || 'Severe error during emergency dispatch.');
    }
  }

  findAll(user?: AuthUser, queue?: string) {
    return this.findAllForUser(user, queue);
  }

  async findAllForUser(user?: AuthUser, queue?: string) {
    let where: Prisma.EmergencyRequestWhereInput = {};

    if (this.isDispatcherUser(user)) {
      where = await this.dispatcherWhereForQueue(user!, queue);
    }

    return this.prisma.emergencyRequest.findMany({
      where,
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

  async findOne(id: string, user?: AuthUser) {
    const emergencyRequest = await this.prisma.emergencyRequest.findUnique({
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
        station: { select: { id: true, name: true, regionId: true } },
        destinationHospital: true,
        incidentCategory: true,
        referrals: true,
        caseTransfers: {
          orderBy: { createdAt: 'desc' },
          include: {
            fromStation: { select: { id: true, name: true } },
            toStation: { select: { id: true, name: true } },
            transferredBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        statusLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByEmployee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeRole: { select: { name: true } },
              },
            },
          },
        },
        patientCareRecords: {
          orderBy: { createdAt: 'desc' },
          include: {
            nurse: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!emergencyRequest) {
      throw new NotFoundException('Emergency request not found');
    }

    await this.assertDispatcherCanAccessCase(user, emergencyRequest, 'read');

    return emergencyRequest;
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
    user?: AuthUser,
  ) {
    const existing = await this.prisma.emergencyRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emergency request not found');

    await this.assertDispatcherCanAccessCase(user, existing, 'assign');

    if (!data.driverId) {
      throw new BadRequestException('A driver must be assigned before dispatch');
    }
    if (caseRequiresNurse(existing) && !data.nurseId) {
      throw new BadRequestException(
        'Nurse required — assign a nurse to this case before dispatch can proceed',
      );
    }

    if (data.driverId) {
      await assertDispatchEligibleStaff(this.prisma, data.driverId, 'Driver');
    }
    if (data.nurseId) {
      await assertDispatchEligibleStaff(this.prisma, data.nurseId, 'Nurse');
    }

    if (data.nurseId) {
      const busyNurse = await this.prisma.emergencyRequest.findFirst({
        where: {
          nurseId: data.nurseId,
          status: { in: ACTIVE_CASE_STATUSES },
          id: { not: id },
        },
      });
      if (busyNurse) throw new ConflictException('Nurse is already assigned to another active emergency');
    }

    // Logic: Prevent assigning a driver/ambulance already on another active request
    
    if (data.driverId) {
      const busyDriver = await this.prisma.emergencyRequest.findFirst({
        where: { 
          driverId: data.driverId, 
          status: { in: ACTIVE_CASE_STATUSES },
          id: { not: id } 
        }
      });
      if (busyDriver) throw new ConflictException('Driver is already assigned to another active emergency');
    }

    if (data.ambulanceId) {
      const busyAmbulance = await this.prisma.emergencyRequest.findFirst({
        where: { 
          ambulanceId: data.ambulanceId, 
          status: { in: ACTIVE_CASE_STATUSES },
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

    // Keep the crew paired with the dispatched ambulance so the assignment is
    // reflected system-wide (availability boards, driver/nurse apps, etc.).
    if (data.ambulanceId) {
      const crewIds = [data.driverId, data.nurseId].filter(Boolean) as string[];
      if (crewIds.length) {
        await this.prisma.employee.updateMany({
          where: { id: { in: crewIds } },
          data: { assignedAmbulanceId: data.ambulanceId },
        });
      }
    }

    const assignedIds = [result.driver?.userId, result.nurse?.userId].filter(Boolean) as string[];

    const gpsNote =
      result.pickupLatitude != null && result.pickupLongitude != null
        ? ` GPS: ${result.pickupLatitude}, ${result.pickupLongitude}`
        : '';

    const dispatcherUserId = data.dispatcherId
      ? (
          await this.prisma.employee.findUnique({
            where: { id: data.dispatcherId },
            select: { userId: true },
          })
        )?.userId
      : undefined;

    await this.notifications.dispatchEvent({
      eventKey: 'MISSION_ASSIGNED',
      title: 'Mission Assigned',
      message: `Team assigned to ${result.trackingCode} — Ambulance ${result.ambulance?.ambulanceNumber ?? 'N/A'}.${gpsNote}`,
      type: 'EMERGENCY',
      category: 'MISSION',
      priority: result.priority as any,
      entityType: 'EmergencyRequest',
      entityId: result.id,
      redirectUrl: `/dispatcher/emergency/active?id=${result.id}`,
      context: {
        createdById: (data as any).createdByUserId,
        regionId: result.regionId ?? existing.regionId ?? null,
        assignedUserIds: [...assignedIds, dispatcherUserId].filter(Boolean) as string[],
        includeEmployeeRoles: ['Driver', 'Nurse'],
      },
    });

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

  async updateStatus(
    id: string,
    status: EmergencyRequestStatus,
    employeeId?: string,
    user?: AuthUser,
  ) {
    const existing = await this.prisma.emergencyRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emergency request not found');

    await this.assertDispatcherCanAccessCase(user, existing, 'mutate');

    if (status === 'COMPLETED') {
      const handover = await this.prisma.patientCareRecord.findFirst({
        where: {
          requestId: id,
          clinicalNotes: { startsWith: '[EADS_HANDOVER]' },
        },
      });
      if (!handover) {
        throw new BadRequestException('Case cannot be completed until hospital handover is recorded.');
      }
    }

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

    if (status === 'COMPLETED') {
      const crewIds = [existing.driverId, existing.nurseId].filter(Boolean) as string[];
      if (crewIds.length) {
        await this.prisma.employee.updateMany({
          where: { id: { in: crewIds } },
          data: { shiftStatus: 'AVAILABLE' },
        });
      }
      if (existing.ambulanceId) {
        await this.prisma.ambulance.update({
          where: { id: existing.ambulanceId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    const assignedIds = await this.teamUserIds(existing.id);
    const dispatcherUserId = existing.dispatcherId
      ? (
          await this.prisma.employee.findUnique({
            where: { id: existing.dispatcherId },
            select: { userId: true },
          })
        )?.userId
      : undefined;
    const notifyTeamIds = [...assignedIds, dispatcherUserId].filter(Boolean) as string[];
    const actorUserId = employeeId
      ? (await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } }))?.userId
      : undefined;

    if (status === 'COMPLETED') {
      await this.notifications.dispatchEvent({
        eventKey: 'MISSION_COMPLETED',
        title: 'Mission Completed',
        message: `Case ${existing.trackingCode} has been completed successfully.`,
        type: 'EMERGENCY',
        category: 'MISSION',
        priority: existing.priority as any,
        entityType: 'EmergencyRequest',
        entityId: existing.id,
        redirectUrl: `/dispatcher/emergency-requests/${existing.id}`,
        context: { createdById: actorUserId, assignedUserIds: notifyTeamIds },
      });
    } else {
      await this.notifications.dispatchEvent({
        eventKey: 'MISSION_UPDATED',
        title: 'Mission Updated',
        message: `Case ${existing.trackingCode} status changed to ${status}`,
        type: 'EMERGENCY',
        category: 'MISSION',
        priority: existing.priority as any,
        entityType: 'EmergencyRequest',
        entityId: existing.id,
        redirectUrl: `/dispatcher/emergency-requests/${existing.id}`,
        context: { createdById: actorUserId, assignedUserIds: notifyTeamIds },
      });
    }

    // Emit real-time tracking update
    const trackingData = await this.trackingService.findByCodeOrPhone(existing.trackingCode);
    this.trackingGateway.emitTrackingUpdate(existing.trackingCode, trackingData);

    if (existing.destinationHospitalId) {
      const hospitalStatuses: EmergencyRequestStatus[] = [
        'TRANSPORTING',
        'EN_ROUTE',
        'DISPATCHED',
        'ARRIVED_HOSPITAL',
        'ARRIVED_SCENE',
        'PATIENT_STABILIZED',
      ];
      if (hospitalStatuses.includes(status)) {
        const coordCase = await this.prisma.hospitalCoordinationCase.findFirst({
          where: { emergencyRequestId: existing.id, hospitalId: existing.destinationHospitalId, deletedAt: null },
          select: { id: true },
        });
        const eta = trackingData?.estimatedArrival;
        let title = 'Mission Updated';
        let message = `Case ${existing.trackingCode} status: ${status.replace(/_/g, ' ')}`;
        let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' = existing.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH';

        if (status === 'TRANSPORTING') {
          title = 'Ambulance En Route';
          message = eta
            ? `Ambulance is transporting patient. ETA: ${eta.replace(' mins', ' Minutes')}`
            : 'Ambulance is transporting patient to your hospital.';
        } else if (status === 'ARRIVED_HOSPITAL') {
          title = 'Ambulance Has Arrived';
          message = 'Ambulance has arrived. Proceed with patient reception.';
          priority = 'CRITICAL';
        } else if (existing.priority === 'CRITICAL' && ['EN_ROUTE', 'TRANSPORTING'].includes(status)) {
          title = 'Critical Patient Alert';
          message = eta
            ? `Critical patient arriving. ETA: ${eta.replace(' mins', ' Minutes')}. Prepare emergency team immediately.`
            : 'Critical patient en route. Prepare emergency team immediately.';
        }

        await this.notifications.notifyHospitalStaff(existing.destinationHospitalId, {
          eventKey: 'HOSPITAL_RESPONSE',
          title,
          message,
          type: 'EMERGENCY',
          category: 'HOSPITAL',
          priority,
          entityType: 'HospitalCoordinationCase',
          entityId: coordCase?.id ?? existing.id,
          redirectUrl: coordCase?.id
            ? `/hospital/emergency-cases/${coordCase.id}`
            : '/hospital/emergency-cases?tab=active',
        });
      }
    }

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

  async cancelRequest(id: string, reason: string, employeeId?: string, user?: AuthUser) {
    const existing = await this.prisma.emergencyRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emergency request not found');

    await this.assertDispatcherCanAccessCase(user, existing, 'mutate');

    const updated = await this.prisma.emergencyRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason,
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

    const assignedIds = await this.teamUserIds(existing.id);
    const actorUserId = employeeId
      ? (await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } }))?.userId
      : undefined;

    await this.notifications.dispatchEvent({
      eventKey: 'MISSION_CANCELLED',
      title: 'Mission Cancelled',
      message: `Case ${existing.trackingCode} was cancelled. Reason: ${reason}`,
      type: 'EMERGENCY',
      category: 'MISSION',
      priority: existing.priority as any,
      entityType: 'EmergencyRequest',
      entityId: existing.id,
      redirectUrl: `/admin/emergency-requests/active?id=${existing.id}`,
      context: { createdById: actorUserId, assignedUserIds: assignedIds },
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

  async completeRequest(
    id: string,
    dto: {
      acceptedHospital?: string
      rejectedHospitals?: string
      consciousStatus?: string
      breathingStatus?: string
      bleedingStatus?: string
      patientConditionAtClose?: string
      receivingStaff?: string
      treatmentSummary?: string
      handoverNotes?: string
      dispatcherNotes?: string
    },
    employeeId?: string,
    user?: AuthUser,
  ) {
    const existing = await this.prisma.emergencyRequest.findUnique({
      where: { id },
      include: {
        driver: { select: { firstName: true, lastName: true } },
        nurse: { select: { firstName: true, lastName: true } },
        ambulance: { select: { ambulanceNumber: true } },
        destinationHospital: { select: { name: true } },
      },
    });
    if (!existing) throw new NotFoundException('Emergency request not found');

    await this.assertDispatcherCanAccessCase(user, existing, 'mutate');

    if (existing.status === 'COMPLETED') {
      throw new BadRequestException('Case is already completed');
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled cases cannot be completed');
    }

    const driverName = existing.driver
      ? `${existing.driver.firstName || ''} ${existing.driver.lastName || ''}`.trim()
      : '';
    const nurseName = existing.nurse
      ? `${existing.nurse.firstName || ''} ${existing.nurse.lastName || ''}`.trim()
      : '';
    const acceptedHospital =
      dto.acceptedHospital?.trim() ||
      existing.destinationHospital?.name ||
      existing.destination ||
      '';
    const summaryLines = [
      '[Dispatcher Completion]',
      driverName ? `Driver: ${driverName}` : null,
      nurseName ? `Nurse: ${nurseName}` : null,
      existing.ambulance?.ambulanceNumber
        ? `Ambulance: ${existing.ambulance.ambulanceNumber}`
        : null,
      acceptedHospital ? `Accepted hospital: ${acceptedHospital}` : null,
      dto.rejectedHospitals?.trim()
        ? `Rejected hospital(s): ${dto.rejectedHospitals.trim()}`
        : null,
      dto.consciousStatus ? `Conscious: ${dto.consciousStatus.replace(/_/g, ' ')}` : null,
      dto.breathingStatus ? `Breathing: ${dto.breathingStatus.replace(/_/g, ' ')}` : null,
      dto.bleedingStatus ? `Bleeding: ${dto.bleedingStatus.replace(/_/g, ' ')}` : null,
      dto.patientConditionAtClose?.trim()
        ? `Patient condition: ${dto.patientConditionAtClose.trim()}`
        : null,
      dto.receivingStaff?.trim() ? `Receiving staff: ${dto.receivingStaff.trim()}` : null,
      dto.treatmentSummary?.trim() ? `Treatment: ${dto.treatmentSummary.trim()}` : null,
      dto.handoverNotes?.trim() ? `Handover notes: ${dto.handoverNotes.trim()}` : null,
      dto.dispatcherNotes?.trim()
        ? `Dispatcher notes: ${dto.dispatcherNotes.trim()}`
        : null,
    ].filter(Boolean);

    const notes = summaryLines.join('\n');

    const updated = await this.prisma.emergencyRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        statusLogs: {
          create: {
            fromStatus: existing.status,
            toStatus: 'COMPLETED',
            changedByEmployeeId: employeeId,
            notes,
          },
        },
      },
      include: {
        statusLogs: true,
        patient: true,
      },
    });

    const crewIds = [existing.driverId, existing.nurseId].filter(Boolean) as string[];
    if (crewIds.length) {
      await this.prisma.employee.updateMany({
        where: { id: { in: crewIds } },
        data: { shiftStatus: 'AVAILABLE' },
      });
    }
    if (existing.ambulanceId) {
      await this.prisma.ambulance.update({
        where: { id: existing.ambulanceId },
        data: { status: 'AVAILABLE' },
      });
    }

    const assignedIds = await this.teamUserIds(existing.id);
    const actorUserId = employeeId
      ? (await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } }))
          ?.userId
      : undefined;

    await this.notifications.dispatchEvent({
      eventKey: 'MISSION_COMPLETED',
      title: 'Mission Completed',
      message: `Case ${existing.trackingCode} has been completed by dispatch.`,
      type: 'EMERGENCY',
      category: 'MISSION',
      priority: existing.priority as any,
      entityType: 'EmergencyRequest',
      entityId: existing.id,
      redirectUrl: `/admin/emergency-requests/completed?id=${existing.id}`,
      context: { createdById: actorUserId, assignedUserIds: assignedIds },
    });

    const trackingData = await this.trackingService.findByCodeOrPhone(existing.trackingCode);
    this.trackingGateway.emitTrackingUpdate(existing.trackingCode, trackingData);

    await this.auditLog.logCaseActivity(
      employeeId || 'SYSTEM',
      'STATUS_UPDATED',
      existing.id,
      existing.status,
      'COMPLETED',
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

    await this.notifications.dispatchEvent({
      eventKey: 'MISSION_CANCELLED',
      title: 'Mission Failed',
      message: `Case ${existing.trackingCode} failed. Reason: ${reason}`,
      type: 'EMERGENCY',
      category: 'MISSION',
      priority: 'CRITICAL',
      entityType: 'EmergencyRequest',
      entityId: existing.id,
      redirectUrl: `/admin/emergency-requests/active?id=${existing.id}`,
      context: {
        createdById: employeeId
          ? (await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } }))?.userId
          : undefined,
        assignedUserIds: await this.teamUserIds(existing.id),
      },
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

    await this.notifications.dispatchEvent({
      eventKey: 'EMERGENCY_ESCALATED',
      title: 'Emergency Escalated',
      message: `Case ${existing.trackingCode} escalated to CRITICAL priority.`,
      type: 'EMERGENCY',
      category: 'MISSION',
      priority: 'CRITICAL',
      entityType: 'EmergencyRequest',
      entityId: existing.id,
      redirectUrl: `/admin/emergency-requests/active?id=${existing.id}`,
      context: {
        createdById: employeeId
          ? (await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { userId: true } }))?.userId
          : undefined,
        regionId: existing.regionId ?? null,
      },
    });

    return updated;
  }

  update(id: string, data: Prisma.EmergencyRequestUpdateInput) {
    return this.prisma.emergencyRequest.update({
      where: { id },
      data,
      include: {
        patient: true,
        ambulance: true,
        driver: true,
        dispatcher: true,
      },
    });
  }

  delete(id: string) {
    return this.prisma.emergencyRequest.delete({
      where: { id },
    });
  }

  private async generateTrackingCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CASE-${year}-`;

    const latest = await this.prisma.emergencyRequest.findFirst({
      where: { trackingCode: { startsWith: prefix } },
      orderBy: { trackingCode: 'desc' },
      select: { trackingCode: true },
    });

    let nextSequence = 1;
    if (latest?.trackingCode) {
      const match = latest.trackingCode.match(/^CASE-\d{4}-(\d+)/);
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }

    for (let offset = 0; offset < 20; offset++) {
      const sequence = String(nextSequence + offset).padStart(4, '0');
      const code = `${prefix}${sequence}`;
      const exists = await this.prisma.emergencyRequest.findUnique({
        where: { trackingCode: code },
        select: { id: true },
      });
      if (!exists) return code;
    }

    const fallback = `${prefix}${Date.now().toString().slice(-6)}`;
    return fallback;
  }

  private mapGender(gender?: string | null): 'MALE' | 'FEMALE' | null {
    if (!gender) return null;
    const normalized = gender.trim().toUpperCase();
    if (normalized === 'MALE' || normalized === 'FEMALE') return normalized;
    return null;
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
    const busyAmbulanceIds = (await this.prisma.emergencyRequest.findMany({
      where: { status: { in: ACTIVE_CASE_STATUSES } },
      select: { ambulanceId: true }
    })).map(r => r.ambulanceId).filter(Boolean);

    return this.prisma.ambulance.findMany({
      where: {
        status: 'AVAILABLE',
        id: { notIn: busyAmbulanceIds as string[] }
      },
      include: {
        equipmentLevel: true,
        station: true,
        region: true,
      },
    });
  }

  async getAvailableDrivers() {
    const driverRole = await this.prisma.employeeRole.findFirst({
      where: { name: { contains: 'Driver', mode: 'insensitive' } }
    });
    
    if (!driverRole) return [];

    const [busyDriverIds, presentIds, drivers] = await Promise.all([
      this.prisma.emergencyRequest.findMany({
        where: { status: { in: ACTIVE_CASE_STATUSES } },
        select: { driverId: true },
      }).then((rows) => rows.map((r) => r.driverId).filter(Boolean) as string[]),
      getPresentEmployeeIdsToday(this.prisma),
      this.prisma.employee.findMany({
        where: {
          employeeRoleId: driverRole.id,
          status: 'ACTIVE',
          shiftStatus: { in: [...ASSIGNABLE_SHIFT_STATUSES] },
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
          assignedAmbulance: { include: { equipmentLevel: true } },
        },
      }),
    ]);

    const available = drivers.filter((d) => !busyDriverIds.includes(d.id));
    return filterDispatchEligibleEmployees(available, presentIds);
  }

  async getAvailableNurses() {
    const nurseRole = await this.prisma.employeeRole.findFirst({
      where: { name: { contains: 'Nurse', mode: 'insensitive' } }
    });
    
    if (!nurseRole) return [];

    const [busyNurseIds, presentIds, nurses] = await Promise.all([
      this.prisma.emergencyRequest.findMany({
        where: { status: { in: ACTIVE_CASE_STATUSES } },
        select: { nurseId: true },
      }).then((rows) => rows.map((r) => r.nurseId).filter(Boolean) as string[]),
      getPresentEmployeeIdsToday(this.prisma),
      this.prisma.employee.findMany({
        where: {
          employeeRoleId: nurseRole.id,
          status: 'ACTIVE',
          shiftStatus: { in: [...ASSIGNABLE_SHIFT_STATUSES] },
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
          assignedAmbulance: { include: { equipmentLevel: true } },
        },
      }),
    ]);

    const available = nurses.filter((n) => !busyNurseIds.includes(n.id));
    return filterDispatchEligibleEmployees(available, presentIds);
  }

  async transferCaseStation(
    id: string,
    dto: { toStationId: string; reason: string },
    user?: AuthUser,
  ) {
    const existing = await this.prisma.emergencyRequest.findUnique({
      where: { id },
      include: { station: true, patient: true },
    });
    if (!existing) throw new NotFoundException('Emergency request not found');

    await this.assertDispatcherCanAccessCase(user, existing, 'transfer');

    const reason = String(dto.reason ?? '').trim();
    if (!reason) throw new BadRequestException('Transfer reason is required');
    if (!dto.toStationId) throw new BadRequestException('Receiving station is required');

    const toStation = await this.prisma.station.findFirst({
      where: { id: dto.toStationId, isActive: true },
    });
    if (!toStation) throw new BadRequestException('Target station not found or inactive');
    if (existing.stationId === dto.toStationId) {
      throw new BadRequestException('Case is already assigned to this station');
    }

    const transferredById = user?.employeeId;
    if (!transferredById) {
      throw new ForbiddenException('Employee profile required to transfer cases');
    }

    const hadAssignment = Boolean(existing.ambulanceId || existing.driverId || existing.nurseId);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.emergencyCaseTransfer.create({
        data: {
          emergencyRequestId: id,
          fromStationId: existing.stationId,
          toStationId: dto.toStationId,
          transferredById,
          reason,
        },
      });

      return tx.emergencyRequest.update({
        where: { id },
        data: {
          stationId: dto.toStationId,
          dispatcherId: null,
          status: 'PENDING',
          ambulanceId: null,
          driverId: null,
          nurseId: null,
          assignedAt: null,
          statusLogs: {
            create: {
              fromStatus: existing.status,
              toStatus: 'PENDING',
              changedByEmployeeId: transferredById,
              notes: `Transferred to ${toStation.name}. Reason: ${reason}`,
            },
          },
        },
        include: {
          patient: true,
          station: { select: { id: true, name: true } },
          caseTransfers: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              fromStation: { select: { id: true, name: true } },
              toStation: { select: { id: true, name: true } },
              transferredBy: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      });
    });

    const actorUserId = user?.sub;
    await this.notifications.dispatchEvent({
      eventKey: 'CASE_STATION_TRANSFER',
      title: 'Case transferred to your station',
      message: `Case ${existing.trackingCode} transferred to ${toStation.name}${hadAssignment ? ' (crew unassigned)' : ''}. Reason: ${reason}`,
      type: 'EMERGENCY',
      category: 'MISSION',
      priority: existing.priority as any,
      entityType: 'EmergencyRequest',
      entityId: existing.id,
      redirectUrl: `/dispatcher/emergency/pending?id=${existing.id}`,
      context: {
        createdById: actorUserId,
        stationId: dto.toStationId,
        regionId: toStation.regionId,
      },
    });

    return updated;
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
