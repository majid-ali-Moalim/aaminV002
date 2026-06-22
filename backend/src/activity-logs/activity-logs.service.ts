import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type OperationalActivityCategory =
  | 'emergency'
  | 'case'
  | 'hospital'
  | 'user'
  | 'alert'
  | 'ambulance';

export interface OperationalActivityItem {
  id: string;
  category: OperationalActivityCategory;
  kind: string;
  title: string;
  description: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
  href: string;
  actionLabel: string;
  trackingCode?: string;
  priority?: string;
}

export interface OperationalActivityFeed {
  summary: {
    todayCount: number;
    criticalCount: number;
    pendingCount: number;
  };
  activities: OperationalActivityItem[];
}

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  findAll(options?: {
    limit?: number;
    entityType?: string;
    userId?: string;
    since?: Date;
  }) {
    const limit = Math.min(options?.limit ?? 100, 500);

    return this.prisma.activityLog.findMany({
      where: {
        entityType: options?.entityType || undefined,
        userId: options?.userId || undefined,
        createdAt: options?.since ? { gte: options.since } : undefined,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeRole: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async getOperationalFeed(options?: {
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<OperationalActivityFeed> {
    const limit = Math.min(options?.limit ?? 15, 50);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const search = options?.search?.trim().toLowerCase() ?? '';

    const [
      activityLogs,
      statusLogs,
      recentCases,
      hospitalAcceptances,
      newUsers,
      newHospitals,
      newAmbulances,
      criticalActive,
      pendingCases,
    ] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: {
          createdAt: { gte: since },
          OR: [
            { entityType: 'EmergencyRequest' },
            { action: { in: ['ASSIGNED_TEAM', 'STATUS_UPDATED', 'HOSPITAL_ACCEPTED', 'CASE_CREATED'] } },
          ],
        },
        take: 80,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  employeeRole: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.emergencyStatusLog.findMany({
        where: { createdAt: { gte: since } },
        take: 60,
        orderBy: { createdAt: 'desc' },
        include: {
          emergencyRequest: {
            select: {
              id: true,
              trackingCode: true,
              priority: true,
              ambulance: { select: { ambulanceNumber: true } },
              driver: { select: { firstName: true, lastName: true } },
              nurse: { select: { firstName: true, lastName: true } },
            },
          },
          changedByEmployee: {
            select: {
              firstName: true,
              lastName: true,
              employeeRole: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.emergencyRequest.findMany({
        where: { createdAt: { gte: since } },
        take: 40,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          trackingCode: true,
          priority: true,
          createdAt: true,
          patient: { select: { fullName: true } },
          dispatcher: {
            select: {
              firstName: true,
              lastName: true,
              employeeRole: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.hospitalCoordinationCase.findMany({
        where: {
          deletedAt: null,
          status: 'ACCEPTED',
          updatedAt: { gte: since },
        },
        take: 30,
        orderBy: { updatedAt: 'desc' },
        include: {
          hospital: { select: { id: true, name: true } },
          emergencyRequest: { select: { id: true, trackingCode: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: since }, role: { not: 'PATIENT' } },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          employee: {
            select: {
              firstName: true,
              lastName: true,
              employeeRole: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.hospital.findMany({
        where: { createdAt: { gte: since } },
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true },
      }),
      this.prisma.ambulance.findMany({
        where: { createdAt: { gte: since } },
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: { id: true, ambulanceNumber: true, createdAt: true },
      }),
      this.prisma.activityLog.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.emergencyRequest.count({
        where: {
          priority: 'CRITICAL',
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      this.prisma.emergencyRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const items: OperationalActivityItem[] = [];
    const seen = new Set<string>();

    const push = (item: OperationalActivityItem) => {
      const key = `${item.kind}-${item.trackingCode ?? item.id}-${item.createdAt}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(item);
    };

    for (const req of recentCases) {
      const actor = req.dispatcher;
      const actorName = actor
        ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') || 'Dispatcher'
        : 'System';
      const actorRole = actor?.employeeRole?.name ?? 'Dispatcher';

      push({
        id: `case-created-${req.id}`,
        category: req.priority === 'CRITICAL' ? 'alert' : 'emergency',
        kind: req.priority === 'CRITICAL' ? 'CRITICAL_ALERT' : 'CASE_CREATED',
        title: req.priority === 'CRITICAL' ? 'Critical Alert Created' : 'New Emergency Case',
        description: `${req.trackingCode} created for ${req.patient?.fullName ?? 'patient'}`,
        actorName,
        actorRole,
        createdAt: req.createdAt.toISOString(),
        href: `/admin/emergency-requests/${req.id}`,
        actionLabel: 'Open Case',
        trackingCode: req.trackingCode,
        priority: req.priority,
      });
    }

    for (const log of statusLogs) {
      const req = log.emergencyRequest;
      if (!req) continue;
      const mapped = this.mapStatusLogToActivity(log, req);
      if (mapped) push(mapped);
    }

    for (const log of activityLogs) {
      const mapped = this.mapActivityLogToActivities(log);
      for (const item of mapped) push(item);
    }

    for (const hc of hospitalAcceptances) {
      push({
        id: `hospital-accept-${hc.id}`,
        category: 'hospital',
        kind: 'HOSPITAL_ACCEPTED',
        title: 'Hospital Accepted Case',
        description: `${hc.hospital?.name ?? 'Hospital'} accepted ${hc.emergencyRequest?.trackingCode ?? hc.caseNumber}`,
        actorName: hc.receivingStaffName || hc.hospital?.name || 'Hospital Coordinator',
        actorRole: 'Hospital Coordinator',
        createdAt: hc.updatedAt.toISOString(),
        href: hc.emergencyRequest?.id
          ? `/admin/emergency-requests/${hc.emergencyRequest.id}`
          : `/admin/hospitals/incoming`,
        actionLabel: 'Open Case',
        trackingCode: hc.emergencyRequest?.trackingCode ?? hc.caseNumber,
      });
    }

    for (const user of newUsers) {
      const emp = user.employee;
      const name = emp
        ? [emp.firstName, emp.lastName].filter(Boolean).join(' ')
        : user.username;
      push({
        id: `user-created-${user.id}`,
        category: 'user',
        kind: 'USER_CREATED',
        title: 'New User Created',
        description: `${name} joined the system`,
        actorName: 'System',
        actorRole: 'Administration',
        createdAt: user.createdAt.toISOString(),
        href: `/admin/users`,
        actionLabel: 'View Users',
      });
    }

    for (const hospital of newHospitals) {
      push({
        id: `hospital-new-${hospital.id}`,
        category: 'hospital',
        kind: 'HOSPITAL_REGISTERED',
        title: 'New Hospital Registered',
        description: `${hospital.name} added to the network`,
        actorName: 'System',
        actorRole: 'Administration',
        createdAt: hospital.createdAt.toISOString(),
        href: `/admin/hospitals`,
        actionLabel: 'View Hospitals',
      });
    }

    for (const amb of newAmbulances) {
      push({
        id: `ambulance-new-${amb.id}`,
        category: 'ambulance',
        kind: 'AMBULANCE_ADDED',
        title: 'New Ambulance Added',
        description: `${amb.ambulanceNumber} registered in the fleet`,
        actorName: 'System',
        actorRole: 'Administration',
        createdAt: amb.createdAt.toISOString(),
        href: `/admin/ambulances`,
        actionLabel: 'View Ambulances',
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let filtered = items;
    const cat = options?.category?.toLowerCase();
    if (cat && cat !== 'all') {
      if (cat === 'emergency') {
        filtered = items.filter((i) => i.category === 'emergency' || i.category === 'alert');
      } else if (cat === 'missions' || cat === 'cases') {
        filtered = items.filter((i) => i.category === 'case');
      } else if (cat === 'hospitals') {
        filtered = items.filter((i) => i.category === 'hospital');
      } else if (cat === 'users') {
        filtered = items.filter((i) => i.category === 'user' || i.category === 'ambulance');
      }
    }

    if (search) {
      filtered = filtered.filter((i) => {
        const hay = [
          i.title,
          i.description,
          i.actorName,
          i.actorRole,
          i.trackingCode ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(search);
      });
    }

    const activityCount = items.length;

    return {
      summary: {
        todayCount: activityCount,
        criticalCount: criticalActive,
        pendingCount: pendingCases,
      },
      activities: filtered.slice(0, limit),
    };
  }

  private resolveActorFromUser(user: any): { name: string; role: string } {
    if (!user) return { name: 'System', role: 'System' };
    const emp = user.employee;
    const name = emp
      ? [emp.firstName, emp.lastName].filter(Boolean).join(' ') || user.username
      : user.username;
    const role = emp?.employeeRole?.name ?? user.role ?? 'Staff';
    return { name, role };
  }

  private mapActivityLogToActivities(log: any): OperationalActivityItem[] {
    if (log.entityType && !['EmergencyRequest', 'HospitalCoordinationCase'].includes(log.entityType)) {
      return [];
    }

    const meta = (log.metadata ?? {}) as Record<string, unknown>;
    const newStatus = String(meta.newStatus ?? '');
    const actor = this.resolveActorFromUser(log.user);
    const caseId = log.entityId as string | undefined;
    const baseTime = log.createdAt.toISOString();

    if (log.action === 'ASSIGNED_TEAM' && caseId) {
      const items: OperationalActivityItem[] = [];
      if (meta.ambulanceId) {
        items.push({
          id: `log-${log.id}-amb`,
          category: 'case',
          kind: 'AMBULANCE_ASSIGNED',
          title: 'Ambulance Assigned',
          description: 'Ambulance assigned to case',
          actorName: actor.name,
          actorRole: actor.role,
          createdAt: baseTime,
          href: `/admin/emergency-requests/${caseId}`,
          actionLabel: 'Open Case',
        });
      }
      if (meta.driverId) {
        items.push({
          id: `log-${log.id}-driver`,
          category: 'case',
          kind: 'DRIVER_ACCEPTED',
          title: 'Driver Accepted Case',
          description: 'Driver accepted and assigned to case',
          actorName: actor.name,
          actorRole: actor.role,
          createdAt: baseTime,
          href: `/admin/emergency-requests/${caseId}`,
          actionLabel: 'Open Case',
        });
      }
      if (meta.nurseId) {
        items.push({
          id: `log-${log.id}-nurse`,
          category: 'case',
          kind: 'NURSE_ACCEPTED',
          title: 'Nurse Accepted Case',
          description: 'Nurse accepted and assigned to case',
          actorName: actor.name,
          actorRole: actor.role,
          createdAt: baseTime,
          href: `/admin/emergency-requests/${caseId}`,
          actionLabel: 'Open Case',
        });
      }
      return items;
    }

    if (log.action === 'STATUS_UPDATED' && caseId && newStatus) {
      const mapped = this.mapStatusChange(newStatus, caseId, actor.name, actor.role, log.createdAt, `log-${log.id}`);
      return mapped ? [mapped] : [];
    }

    return [];
  }

  private mapStatusLogToActivity(log: any, req: any): OperationalActivityItem | null {
    const employee = log.changedByEmployee;
    const actorName = employee
      ? [employee.firstName, employee.lastName].filter(Boolean).join(' ') || 'Staff'
      : 'System';
    const actorRole = employee?.employeeRole?.name ?? 'Operations';

    return this.mapStatusChange(
      log.toStatus,
      req.id,
      actorName,
      actorRole,
      log.createdAt,
      `status-${log.id}`,
      req.trackingCode,
      req.priority,
      req.ambulance?.ambulanceNumber,
    );
  }

  private mapStatusChange(
    status: string,
    caseId: string,
    actorName: string,
    actorRole: string,
    createdAt: Date,
    id: string,
    trackingCode?: string,
    priority?: string,
    ambulanceNumber?: string,
  ): OperationalActivityItem | null {
    const base = {
      actorName,
      actorRole,
      createdAt: createdAt.toISOString(),
      href: `/admin/emergency-requests/${caseId}`,
      actionLabel: 'Open Case',
      trackingCode,
      priority,
    };

    switch (status) {
      case 'ASSIGNED':
        return {
          ...base,
          id,
          category: 'case',
          kind: 'AMBULANCE_ASSIGNED',
          title: 'Ambulance Assigned',
          description: `${ambulanceNumber ?? 'Unit'} assigned to ${trackingCode ?? 'case'}`,
        };
      case 'DISPATCHED':
      case 'EN_ROUTE':
        return {
          ...base,
          id,
          category: 'case',
          kind: 'DRIVER_ACCEPTED',
          title: 'Driver En Route',
          description: `${trackingCode ?? 'Case'} dispatched — driver accepted`,
        };
      case 'TRANSPORTING':
        return {
          ...base,
          id,
          category: 'case',
          kind: 'TRANSPORT_STARTED',
          title: 'Patient Transport Started',
          description: `Transport started for ${trackingCode ?? 'case'}`,
        };
      case 'ARRIVED_HOSPITAL':
        return {
          ...base,
          id,
          category: 'case',
          kind: 'ARRIVED_HOSPITAL',
          title: 'Patient Arrived at Hospital',
          description: `${trackingCode ?? 'Case'} arrived at destination hospital`,
        };
      case 'COMPLETED':
        return {
          ...base,
          id,
          category: 'case',
          kind: 'CASE_COMPLETED',
          title: 'Case Completed',
          description: `${trackingCode ?? 'Case'} marked completed`,
        };
      default:
        return null;
    }
  }
}
