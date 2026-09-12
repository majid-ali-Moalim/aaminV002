import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CaseWorkflowNotificationService } from '../notifications/case-workflow-notification.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ACTIVE_CASE_STATUSES } from '../common/active-case-statuses';
import { releaseCrewForCase } from '../common/occupied-crew';
import {
  DRIVER_INCIDENT_PREFIX,
  fetchRecentDriverIncidents,
  type DriverIncidentRecord,
} from '../common/driver-incident';
import {
  resolveCaseAssignerUserId,
  resolveCaseDispatcher,
} from '../common/resolve-case-dispatcher';

@Injectable()
export class DriversAppService {
  constructor(
    private prisma: PrismaService,
    private caseWorkflowNotifications: CaseWorkflowNotificationService,
    private notifications: NotificationsService,
  ) {}

  private async attachCaseDispatcher<T extends { id: string; dispatcherId?: string | null; dispatcher?: unknown }>(
    mission: T | null,
  ): Promise<T | null> {
    if (!mission) return null;
    if (mission.dispatcher) return mission;
    const resolved = await resolveCaseDispatcher(this.prisma, mission.id, mission.dispatcherId);
    if (!resolved) return mission;
    return { ...mission, dispatcher: resolved };
  }

  // ─────────────────────────────────────────
  // PROFILE
  // ─────────────────────────────────────────

  async getDriverProfile(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
        station: true,
        employeeRole: true,
        department: true,
        assignedAmbulance: {
          include: { station: true, equipmentLevel: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Driver profile not found');
    }

    return employee;
  }

  async updateDriverProfile(userId: string, data: any) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const { phone, address, emergencyContactName, emergencyPhone } = data;

    return this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...(phone && { phone }),
        ...(address && { address }),
        ...(emergencyContactName && { emergencyContactName }),
        ...(emergencyPhone && { emergencyPhone }),
      },
    });
  }

  // ─────────────────────────────────────────
  // SHIFT / AVAILABILITY
  // ─────────────────────────────────────────

  async getShiftStatus(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const activeShift = await this.prisma.shiftRecord.findFirst({
      where: { employeeId: employee.id, status: 'ON_DUTY', endTime: null },
      orderBy: { createdAt: 'desc' },
    });

    return {
      shiftStatus: employee.shiftStatus,
      employeeId: employee.id,
      activeShift,
    };
  }

  async startShift(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    // Close any open shift
    await this.prisma.shiftRecord.updateMany({
      where: { employeeId: employee.id, status: 'ON_DUTY', endTime: null },
      data: { endTime: new Date(), status: 'COMPLETED' },
    });

    const shift = await this.prisma.shiftRecord.create({
      data: {
        employeeId: employee.id,
        status: 'ON_DUTY',
        startTime: new Date(),
      },
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { shiftStatus: 'ON_DUTY' },
    });

    return { message: 'Shift started', shift };
  }

  async endShift(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    await this.prisma.shiftRecord.updateMany({
      where: { employeeId: employee.id, status: 'ON_DUTY', endTime: null },
      data: { endTime: new Date(), status: 'COMPLETED' },
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { shiftStatus: 'AVAILABLE' },
    });

    return { message: 'Shift ended' };
  }

  async toggleAvailability(userId: string, available: boolean) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const shiftStatus = available ? 'AVAILABLE' : 'OFF_DUTY';
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { shiftStatus },
    });

    return { message: `Availability set to ${shiftStatus}`, shiftStatus };
  }

  // ─────────────────────────────────────────
  // MISSIONS
  // ─────────────────────────────────────────

  async getActiveMission(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const mission = await this.prisma.emergencyRequest.findFirst({
      where: {
        driverId: employee.id,
        status: { in: ACTIVE_CASE_STATUSES },
      },
      include: {
        patient: true,
        ambulance: { include: { station: true } },
        region: true,
        district: true,
        incidentCategory: true,
        nurse: { select: { id: true, firstName: true, lastName: true, phone: true, userId: true } },
        destinationHospital: {
          select: {
            id: true,
            name: true,
            address: true,
            primaryPhone: true,
            emergencyHotline: true,
            emergencyShortCode: true,
          },
        },
        dispatcher: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            phone: true,
            user: { select: { id: true, username: true } },
          },
        },
        statusLogs: { orderBy: { createdAt: 'asc' } },
        patientCareRecords: {
          select: { id: true, clinicalNotes: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.attachCaseDispatcher(mission);
  }

  async getMissionHistory(userId: string, page = 1, limit = 20, status?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const skip = (page - 1) * limit;
    const where: any = { driverId: employee.id };

    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['COMPLETED', 'CANCELLED'] };
    }

    const [missions, total] = await Promise.all([
      this.prisma.emergencyRequest.findMany({
        where,
        include: {
          patient: true,
          ambulance: true,
          region: true,
          district: true,
          incidentCategory: true,
          statusLogs: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.emergencyRequest.count({ where }),
    ]);

    return { missions, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getMissionById(userId: string, missionId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const mission = await this.prisma.emergencyRequest.findUnique({
      where: { id: missionId },
      include: {
        patient: true,
        ambulance: { include: { station: true, equipmentLevel: true } },
        region: true,
        district: true,
        incidentCategory: true,
        nurse: { select: { id: true, firstName: true, lastName: true, phone: true, userId: true } },
        destinationHospital: {
          select: {
            id: true,
            name: true,
            address: true,
            primaryPhone: true,
            emergencyHotline: true,
            emergencyShortCode: true,
          },
        },
        dispatcher: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            phone: true,
            user: { select: { id: true, username: true } },
          },
        },
        statusLogs: { orderBy: { createdAt: 'asc' } },
        patientCareRecords: {
          select: { id: true, clinicalNotes: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!mission) throw new NotFoundException('Mission not found');
    if (mission.driverId !== employee.id) {
      throw new ForbiddenException('Access denied to this mission');
    }

    return this.attachCaseDispatcher(mission);
  }

  async updateMissionStatus(userId: string, missionId: string, status: string, notes?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const mission = await this.prisma.emergencyRequest.findUnique({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission not found');
    if (mission.driverId !== employee.id) {
      throw new ForbiddenException('Access denied to this mission');
    }

    const allowedStatuses = [
      'ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL',
      'COMPLETED',
    ];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    if (status === 'COMPLETED') {
      // A driver may only close the case themselves when no nurse is on it.
      // When both a driver and nurse are assigned, the case completes
      // automatically once the nurse finishes the hospital handover.
      if (mission.nurseId) {
        throw new BadRequestException(
          'This case has a nurse — it completes automatically when the nurse finishes the hospital handover.',
        );
      }
      if (mission.status === 'ASSIGNED') {
        throw new BadRequestException('Start the case before completing it.');
      }
    }

    if (status === 'TRANSPORTING') {
      const loadRecord = await this.prisma.patientCareRecord.findFirst({
        where: {
          requestId: missionId,
          clinicalNotes: { startsWith: '[EADS_LOAD_PATIENT]' },
        },
      });
      if (!loadRecord) {
        throw new BadRequestException(
          'Transport cannot start until the nurse confirms the patient is loaded.',
        );
      }
    }

    const updateData: any = { status };
    if (status === 'DISPATCHED') updateData.dispatchedAt = new Date();
    else if (status === 'ARRIVED_SCENE') updateData.arrivedAtSceneAt = new Date();
    else if (status === 'TRANSPORTING') updateData.departedSceneAt = new Date();
    else if (status === 'ARRIVED_HOSPITAL') updateData.arrivedDestinationAt = new Date();
    else if (status === 'COMPLETED') updateData.completedAt = new Date();

    if (status === 'COMPLETED') {
      await releaseCrewForCase(this.prisma, {
        driverId: mission.driverId,
        nurseId: mission.nurseId,
        ambulanceId: mission.ambulanceId,
      });
    }

    const updated = await this.prisma.emergencyRequest.update({
      where: { id: missionId },
      data: {
        ...updateData,
        statusLogs: {
          create: {
            fromStatus: mission.status as any,
            toStatus: status as any,
            changedByEmployeeId: employee.id,
            notes: notes || `Driver updated status to ${status}`,
          },
        },
      },
      include: {
        patient: true,
        ambulance: true,
        region: true,
        district: true,
        incidentCategory: true,
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    await this.caseWorkflowNotifications.notifyCaseStatusChange({
      caseId: missionId,
      status: status as any,
      actorUserId: userId,
    });

    return updated;
  }

  // ─────────────────────────────────────────
  // AMBULANCE
  // ─────────────────────────────────────────

  async getAssignedAmbulance(userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: {
        assignedAmbulance: {
          include: {
            station: true,
            equipmentLevel: true,
            region: true,
            district: true,
          },
        },
      },
    });

    if (!employee) throw new NotFoundException('Driver profile not found');
    return employee.assignedAmbulance;
  }

  async updateAmbulanceStatus(userId: string, status: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: { assignedAmbulance: true },
    });

    if (!employee?.assignedAmbulance) {
      throw new NotFoundException('No ambulance assigned to this driver');
    }

    const allowedStatuses = ['AVAILABLE', 'ON_DUTY', 'MAINTENANCE', 'UNAVAILABLE'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(`Invalid ambulance status: ${status}`);
    }

    return this.prisma.ambulance.update({
      where: { id: employee.assignedAmbulance.id },
      data: { status: status as any },
    });
  }

  async rejectMissionAssignment(userId: string, missionId: string, reason?: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const request = await this.prisma.emergencyRequest.findUnique({
      where: { id: missionId },
    });
    if (!request) throw new NotFoundException('Mission not found');
    if (request.driverId !== employee.id) {
      throw new ForbiddenException('This mission is not assigned to you');
    }
    if (request.status !== 'ASSIGNED') {
      throw new BadRequestException('Assignment can only be rejected before dispatch begins');
    }

    const note = reason?.trim() || 'Driver rejected the assignment';

    const updated = await this.prisma.emergencyRequest.update({
      where: { id: missionId },
      data: {
        driverId: null,
        nurseId: null,
        ambulanceId: null,
        status: 'REVIEWING',
        statusLogs: {
          create: {
            fromStatus: request.status,
            toStatus: 'REVIEWING',
            changedByEmployeeId: employee.id,
            notes: note,
          },
        },
      },
    });

    await releaseCrewForCase(this.prisma, {
      driverId: employee.id,
      nurseId: request.nurseId,
      ambulanceId: request.ambulanceId,
    });

    return { ok: true, trackingCode: request.trackingCode, request: updated };
  }

  // ─────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, unreadCount, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId, status: 'UNREAD' } }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return { notifications, unreadCount, total, page, totalPages: Math.ceil(total / limit) };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'READ' },
    });
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: { status: 'READ' },
    });
    return { message: 'All notifications marked as read' };
  }

  // ─────────────────────────────────────────
  // PERFORMANCE / DASHBOARD STATS
  // ─────────────────────────────────────────

  async getDashboardStats(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const [total, completed, cancelled, active, shiftRecords] = await Promise.all([
      this.prisma.emergencyRequest.count({ where: { driverId: employee.id } }),
      this.prisma.emergencyRequest.count({ where: { driverId: employee.id, status: 'COMPLETED' } }),
      this.prisma.emergencyRequest.count({ where: { driverId: employee.id, status: 'CANCELLED' } }),
      this.prisma.emergencyRequest.count({
        where: {
          driverId: employee.id,
          status: { in: ACTIVE_CASE_STATUSES },
        },
      }),
      this.prisma.shiftRecord.findMany({
        where: { employeeId: employee.id, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 7,
      }),
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate avg response time from status logs
    const recentCompleted = await this.prisma.emergencyRequest.findMany({
      where: { driverId: employee.id, status: 'COMPLETED', completedAt: { not: null } },
      select: { createdAt: true, dispatchedAt: true, completedAt: true, arrivedAtSceneAt: true },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    const avgResponseMins =
      recentCompleted.length > 0
        ? Math.round(
            recentCompleted
              .filter((r) => r.dispatchedAt && r.arrivedAtSceneAt)
              .reduce((acc, r) => {
                const diffMs = r.arrivedAtSceneAt!.getTime() - r.dispatchedAt!.getTime();
                return acc + diffMs / 60000;
              }, 0) / Math.max(1, recentCompleted.filter((r) => r.dispatchedAt && r.arrivedAtSceneAt).length),
          )
        : 0;

    return {
      totalMissions: total,
      completedMissions: completed,
      cancelledMissions: cancelled,
      activeMissions: active,
      completionRate,
      avgResponseMinutes: avgResponseMins,
      shiftStatus: employee.shiftStatus,
      recentShifts: shiftRecords,
    };
  }

  // ─────────────────────────────────────────
  // FIELD INCIDENT REPORTS
  // ─────────────────────────────────────────

  async createIncidentReport(
    userId: string,
    data: {
      requestId: string;
      title: string;
      type: string;
      description: string;
      priority?: string;
    },
  ) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const title = data.title.trim();
    const description = data.description.trim();
    const type = data.type.trim() || 'Other';
    const priority = (data.priority || 'MEDIUM').toUpperCase();

    if (!title) throw new BadRequestException('Title is required');
    if (!description) throw new BadRequestException('Description is required');

    let requestId = data.requestId?.trim();
    let mission = requestId
      ? await this.prisma.emergencyRequest.findUnique({
          where: { id: requestId },
          select: { id: true, trackingCode: true, status: true, driverId: true, dispatcherId: true },
        })
      : null;

    if (!mission) {
      mission = await this.prisma.emergencyRequest.findFirst({
        where: {
          driverId: employee.id,
          status: { in: ACTIVE_CASE_STATUSES },
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, trackingCode: true, status: true, driverId: true, dispatcherId: true },
      });
      requestId = mission?.id;
    }

    if (!mission || !requestId) {
      throw new BadRequestException('No active mission to attach this report to');
    }
    if (mission.driverId !== employee.id) {
      throw new ForbiddenException('You can only report incidents for your assigned cases');
    }

    const driverName =
      `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Driver';
    const incidentId = randomUUID();
    const now = new Date().toISOString();
    const payload = {
      id: incidentId,
      title,
      type,
      description,
      priority,
      driverId: employee.id,
      driverName,
      requestId,
      trackingCode: mission.trackingCode,
      createdAt: now,
    };

    const log = await this.prisma.emergencyStatusLog.create({
      data: {
        emergencyRequestId: requestId,
        fromStatus: mission.status,
        toStatus: mission.status,
        changedByEmployeeId: employee.id,
        notes: `${DRIVER_INCIDENT_PREFIX}${JSON.stringify(payload)}`,
      },
    });

    await this.prisma.emergencyRequest.update({
      where: { id: requestId },
      data: { updatedAt: new Date() },
    });

    const assignerUserId = await resolveCaseAssignerUserId(
      this.prisma,
      requestId,
      mission.dispatcherId,
    );

    const recipientUserIds: string[] = assignerUserId ? [assignerUserId] : [];

    if (!recipientUserIds.length) {
      const adminUsers = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      recipientUserIds.push(...adminUsers.map((u) => u.id));
    }

    const notifPriority =
      priority === 'CRITICAL' || priority === 'HIGH' ? 'HIGH' : 'MEDIUM';

    await this.notifications.dispatchEvent({
      eventKey: 'INCIDENT_REPORT',
      title: 'Incident report submitted to dispatch',
      message: `${mission.trackingCode}: ${title} (${type}) — ${description.slice(0, 120)}`,
      type: 'COMPLIANCE',
      category: 'INCIDENT',
      priority: notifPriority,
      senderName: driverName,
      entityType: 'DriverIncident',
      entityId: log.id,
      redirectUrl: '/admin/operational-alerts',
      context: {
        createdById: userId,
        directOnly: true,
        recipientUserIds: [...new Set(recipientUserIds)],
      },
    });

    return {
      id: log.id,
      ...payload,
      submittedAt: log.createdAt.toISOString(),
    };
  }

  async getIncidentReports(userId: string): Promise<DriverIncidentRecord[]> {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Driver profile not found');

    const driverMissions = await this.prisma.emergencyRequest.findMany({
      where: { driverId: employee.id },
      select: { id: true },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });
    const requestIds = driverMissions.map((m) => m.id);
    return fetchRecentDriverIncidents(this.prisma, { take: 50, requestIds });
  }
}
