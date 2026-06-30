import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversAppService {
  constructor(private prisma: PrismaService) {}

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

    const activeStatuses = ['ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'];

    const mission = await this.prisma.emergencyRequest.findFirst({
      where: {
        driverId: employee.id,
        status: { in: activeStatuses as any },
      },
      include: {
        patient: true,
        ambulance: { include: { station: true } },
        region: true,
        district: true,
        incidentCategory: true,
        dispatcher: { include: { user: { select: { username: true } } } },
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return mission;
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
        dispatcher: { include: { user: { select: { username: true } } } },
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!mission) throw new NotFoundException('Mission not found');
    if (mission.driverId !== employee.id) {
      throw new ForbiddenException('Access denied to this mission');
    }

    return mission;
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
      'ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'COMPLETED',
    ];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const updateData: any = { status };
    if (status === 'DISPATCHED') updateData.dispatchedAt = new Date();
    else if (status === 'ARRIVED_SCENE') updateData.arrivedAtSceneAt = new Date();
    else if (status === 'TRANSPORTING') updateData.departedSceneAt = new Date();
    else if (status === 'ARRIVED_HOSPITAL') updateData.arrivedDestinationAt = new Date();
    else if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      // Free up driver's shift status
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { shiftStatus: 'AVAILABLE' },
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
          status: { in: ['ASSIGNED', 'DISPATCHED', 'ARRIVED_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'] as any },
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
}
