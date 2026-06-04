import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationDispatchService } from './notification-dispatch.service';
import { DispatchPayload, NotificationEventKey } from './notification-events';
import { enrichNotification, inferCategory, resolveRedirectUrl } from './notification-routing';

export type InboxFilters = {
  userId?: string;
  userRole?: Role;
  category?: NotificationCategory;
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  search?: string;
  unreadOnly?: boolean;
  criticalOnly?: boolean;
  broadcastOnly?: boolean;
  limit?: number;
  offset?: number;
};

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private dispatch: NotificationDispatchService,
    @Optional() private gateway?: NotificationsGateway,
  ) {}

  /**
   * Intelligent event dispatcher — resolves role-based recipients,
   * skips self-notifications, respects user preferences, creates per-recipient records.
   */
  async dispatchEvent(payload: DispatchPayload) {
    const category = payload.category ?? inferCategory(payload.type);
    const redirectUrl = resolveRedirectUrl({
      redirectUrl: payload.redirectUrl,
      entityType: payload.entityType,
      entityId: payload.entityId,
      category,
    });

    const recipientIds = await this.dispatch.resolveRecipients(
      payload.eventKey,
      payload.context ?? {},
    );

    const createdById = payload.context?.createdById
      ? await this.resolveValidUserId(payload.context.createdById)
      : null;

    const created = [];
    for (const userId of recipientIds) {
      const enabled = await this.dispatch.isChannelEnabled(userId, category, 'IN_APP');
      if (!enabled) continue;

      try {
        const row = await this.createForRecipient({
          userId,
          createdById: createdById ?? undefined,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          category,
          priority: payload.priority,
          senderName: payload.senderName,
          eventKey: payload.eventKey,
          entityType: payload.entityType,
          entityId: payload.entityId,
          redirectUrl,
        });
        if (row) created.push(row);
      } catch (err) {
        console.warn(`Notification delivery skipped for user ${userId}:`, err);
      }
    }

    return created;
  }

  /** Ensure createdById references an existing user — avoids FK violations. */
  private async resolveValidUserId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private async createForRecipient(data: {
    userId: string;
    createdById?: string;
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    senderName?: string;
    eventKey?: string;
    entityType?: string;
    entityId?: string;
    redirectUrl?: string;
  }) {
    if (data.createdById && data.createdById === data.userId) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        priority: data.priority,
        userId: data.userId,
        createdById: data.createdById,
        senderName: data.senderName,
        eventKey: data.eventKey,
        entityType: data.entityType,
        entityId: data.entityId,
        relatedModule: data.entityType,
        relatedId: data.entityId,
        actionUrl: data.redirectUrl,
        status: 'UNREAD',
      } as Prisma.NotificationUncheckedCreateInput,
    });

    await this.prisma.notificationDeliveryLog.create({
      data: {
        notificationId: notification.id,
        recipientId: data.userId,
        channel: 'IN_APP',
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    const enriched = enrichNotification(notification);
    this.gateway?.emitNotification(data.userId, enriched);
    const stats = await this.getInboxStats(data.userId);
    this.gateway?.emitStats(data.userId, stats);

    return enriched;
  }

  /** Legacy create — prefer dispatchEvent. Still enforces self-notification skip. */
  async create(data: {
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    userId?: string;
    createdById?: string;
    targetRole?: Role;
    category?: NotificationCategory;
    senderName?: string;
    eventKey?: string;
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    relatedModule?: string;
    relatedId?: string;
  }) {
    const category = inferCategory(data.type, data.category);
    const entityType = data.entityType ?? data.relatedModule;
    const entityId = data.entityId ?? data.relatedId;
    const redirectUrl = resolveRedirectUrl({
      redirectUrl: data.actionUrl,
      entityType,
      entityId,
      category,
    });

    if (data.userId) {
      if (data.createdById && data.createdById === data.userId) return null;
      return this.createForRecipient({
        userId: data.userId,
        createdById: data.createdById,
        title: data.title,
        message: data.message,
        type: data.type,
        category,
        priority: data.priority,
        senderName: data.senderName,
        eventKey: data.eventKey,
        entityType,
        entityId,
        redirectUrl,
      });
    }

    // Role-wide legacy call — convert to dispatch by event key or generic system alert
    const eventKey = (data.eventKey as NotificationEventKey) || 'SYSTEM_ALERT';
    return this.dispatchEvent({
      eventKey,
      title: data.title,
      message: data.message,
      type: data.type,
      category,
      priority: data.priority,
      senderName: data.senderName,
      entityType,
      entityId,
      redirectUrl,
      context: { createdById: data.createdById },
    });
  }

  async broadcast(data: {
    title: string;
    message: string;
    type?: NotificationType;
    priority: NotificationPriority;
    createdById?: string;
    senderName?: string;
    eventKey?: string;
    entityType?: string;
    entityId?: string;
    redirectUrl?: string;
  }) {
    await (this.prisma as any).broadcastMessage.create({
      data: {
        title: data.title,
        message: data.message,
        priority: data.priority,
        createdById: data.createdById,
        targetScope: 'ALL_FIELD',
      },
    });

    return this.dispatchEvent({
      eventKey: 'EMERGENCY_BROADCAST',
      title: data.title,
      message: data.message,
      type: data.type ?? 'SYSTEM',
      category: 'BROADCAST',
      priority: data.priority,
      senderName: data.senderName ?? 'Operations Center',
      entityType: data.entityType,
      entityId: data.entityId,
      redirectUrl: data.redirectUrl ?? '/admin/notifications?tab=broadcasts',
      context: { createdById: data.createdById },
    });
  }

  private inboxWhere(filters: InboxFilters): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = { deletedAt: null };

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.category) where.category = filters.category;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.unreadOnly) where.status = 'UNREAD';
    if (filters.criticalOnly) where.priority = 'CRITICAL';
    if (filters.broadcastOnly) where.category = 'BROADCAST';

    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { message: { contains: q, mode: 'insensitive' } },
            { senderName: { contains: q, mode: 'insensitive' } },
            { relatedId: { contains: q, mode: 'insensitive' } },
            { entityId: { contains: q, mode: 'insensitive' } },
            { eventKey: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return where;
  }

  async findInbox(filters: InboxFilters) {
    const { limit = 20, offset = 0, ...rest } = filters;
    const where = this.inboxWhere(rest);

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          createdBy: { select: { username: true, email: true } },
        } as any,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map(enrichNotification),
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async findAll(filters: InboxFilters) {
    return (await this.findInbox(filters)).items;
  }

  async getInboxStats(userId?: string, _userRole: Role = 'ADMIN') {
    if (!userId) {
      return { total: 0, unread: 0, critical: 0, archived: 0, resolved: 0, broadcasts: 0, categoryCounts: {} };
    }

    const base = this.inboxWhere({ userId });
    const [total, unread, critical, archived, resolved, broadcasts, categoryCounts] =
      await Promise.all([
        this.prisma.notification.count({ where: base }),
        this.prisma.notification.count({ where: { ...base, status: 'UNREAD' } }),
        this.prisma.notification.count({
          where: { ...base, priority: 'CRITICAL', status: { not: 'ARCHIVED' } },
        }),
        this.prisma.notification.count({ where: { ...base, status: 'ARCHIVED' } }),
        this.prisma.notification.count({ where: { ...base, status: 'RESOLVED' } }),
        this.prisma.notification.count({ where: { ...base, category: 'BROADCAST' } }),
        this.prisma.notification.groupBy({ by: ['category'], where: base, _count: true }),
      ]);

    return {
      total,
      unread,
      critical,
      archived,
      resolved,
      broadcasts,
      categoryCounts: categoryCounts.reduce<Record<string, number>>((acc, row) => {
        acc[row.category] = row._count;
        return acc;
      }, {}),
    };
  }

  async getStats(userId?: string, userRole: Role = 'ADMIN') {
    return this.getInboxStats(userId, userRole);
  }

  async markAsRead(id: string, userId?: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, deletedAt: null, ...(userId ? { userId } : {}) },
    });
    if (!existing) throw new NotFoundException('Notification not found');

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: 'READ', readAt: new Date() },
    });

    await this.prisma.notificationDeliveryLog.updateMany({
      where: { notificationId: id, readAt: null },
      data: { status: 'READ', readAt: new Date() },
    });

    if (userId) {
      this.gateway?.emitStats(userId, await this.getInboxStats(userId));
    }

    return enrichNotification(updated);
  }

  async markAsUnread(id: string, userId?: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id, deletedAt: null, ...(userId ? { userId } : {}) },
    });
    if (!existing) throw new NotFoundException('Notification not found');

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: 'UNREAD', readAt: null },
    });
    return enrichNotification(updated);
  }

  async markAllAsRead(userId?: string, _userRole: Role = 'ADMIN') {
    if (!userId) return { count: 0 };
    const where = this.inboxWhere({ userId, unreadOnly: true });
    const result = await this.prisma.notification.updateMany({
      where,
      data: { status: 'READ', readAt: new Date() },
    });
    this.gateway?.emitStats(userId, await this.getInboxStats(userId));
    return result;
  }

  async archive(id: string) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return enrichNotification(updated);
  }

  async resolve(id: string) {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });
    return enrichNotification(updated);
  }

  async remove(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getPreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findMany({ where: { userId } });
    if (existing.length) return existing;

    const defaults: NotificationCategory[] = [
      'MISSION',
      'COMMUNICATION',
      'ATTENDANCE',
      'HOSPITAL',
      'INCIDENT',
      'SYSTEM',
      'BROADCAST',
    ];

    await this.prisma.notificationPreference.createMany({
      data: defaults.flatMap((category) => [
        { userId, category, channel: 'IN_APP', enabled: true },
        { userId, category, channel: 'EMAIL', enabled: category !== 'BROADCAST' },
      ]),
      skipDuplicates: true,
    });

    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  async updatePreferences(
    userId: string,
    prefs: { category: NotificationCategory; channel: string; enabled: boolean }[],
  ) {
    await Promise.all(
      prefs.map((pref) =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_category_channel: {
              userId,
              category: pref.category,
              channel: pref.channel,
            },
          },
          create: {
            userId,
            category: pref.category,
            channel: pref.channel,
            enabled: pref.enabled,
          },
          update: { enabled: pref.enabled },
        }),
      ),
    );
    return this.getPreferences(userId);
  }

  async getBroadcasts(limit = 50) {
    return (this.prisma as any).broadcastMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAlerts(filters?: { status?: string; priority?: NotificationPriority }) {
    return this.prisma.alert.findMany({
      where: { deletedAt: null, status: filters?.status, priority: filters?.priority },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createAlert(data: {
    title: string;
    message: string;
    alertType: string;
    priority?: NotificationPriority;
    createdById?: string;
    assignedToId?: string;
    entityType?: string;
    entityId?: string;
    redirectUrl?: string;
  }) {
    const alert = await this.prisma.alert.create({
      data: {
        title: data.title,
        message: data.message,
        alertType: data.alertType,
        priority: data.priority ?? 'HIGH',
        assignedToId: data.assignedToId,
        relatedModule: data.entityType,
        relatedId: data.entityId,
        actionUrl: data.redirectUrl,
        status: 'ACTIVE',
      },
    });

    await this.dispatchEvent({
      eventKey: 'EMERGENCY_ESCALATED',
      title: data.title,
      message: data.message,
      type: 'EMERGENCY',
      category: 'BROADCAST',
      priority: data.priority ?? 'HIGH',
      senderName: 'Alert Center',
      entityType: data.entityType,
      entityId: data.entityId,
      redirectUrl: data.redirectUrl ?? '/admin/notifications?tab=critical',
      context: { createdById: data.createdById },
    });

    return alert;
  }

  async resolveAlert(id: string) {
    return this.prisma.alert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
  }

  async getDeliveryLogs(notificationId?: string) {
    return this.prisma.notificationDeliveryLog.findMany({
      where: notificationId ? { notificationId } : undefined,
      orderBy: { sentAt: 'desc' },
      take: 100,
      include: {
        notification: {
          select: { title: true, type: true, category: true, priority: true },
        },
      },
    });
  }

  async checkMaintenanceAlerts(createdById?: string) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);

    const ambulances = await this.prisma.ambulance.findMany({
      where: {
        OR: [{ fuelLevel: { lt: 20 } }, { nextMaintenance: { lte: targetDate } }],
      },
    });

    for (const amb of ambulances) {
      if ((amb.fuelLevel ?? 100) < 20) {
        await this.dispatchEvent({
          eventKey: 'SYSTEM_ALERT',
          title: 'Ambulance Fuel Low',
          message: `Ambulance ${amb.ambulanceNumber} fuel level is at ${amb.fuelLevel}%`,
          type: 'MAINTENANCE',
          category: 'SYSTEM',
          priority: 'HIGH',
          entityType: 'Ambulance',
          entityId: amb.id,
          senderName: 'Fleet Monitor',
          context: { createdById },
        });
      }
    }
  }
}
