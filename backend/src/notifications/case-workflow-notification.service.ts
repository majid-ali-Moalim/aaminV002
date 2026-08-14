import { Injectable } from '@nestjs/common';
import { EmergencyRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import {
  buildCaseNotificationContent,
  CaseNotificationContext,
  CaseWorkflowEvent,
  resolveCaseEventRecipientUserIds,
  statusToCaseWorkflowEvent,
} from './case-workflow-events';
import { NotificationEventKey } from './notification-events';

@Injectable()
export class CaseWorkflowNotificationService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private dispatch: NotificationDispatchService,
  ) {}

  async loadCaseContext(caseId: string): Promise<CaseNotificationContext | null> {
    const req = await this.prisma.emergencyRequest.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        trackingCode: true,
        priority: true,
        stationId: true,
        regionId: true,
        driver: { select: { userId: true } },
        nurse: { select: { userId: true } },
        dispatcher: { select: { userId: true } },
      },
    });
    if (!req) return null;

    return {
      caseId: req.id,
      trackingCode: req.trackingCode,
      priority: req.priority as CaseNotificationContext['priority'],
      stationId: req.stationId,
      regionId: req.regionId,
      driverUserId: req.driver?.userId ?? null,
      nurseUserId: req.nurse?.userId ?? null,
      dispatcherUserId: req.dispatcher?.userId ?? null,
    };
  }

  async notifyCaseEvent(params: {
    caseId: string;
    event: CaseWorkflowEvent;
    actorUserId?: string | null;
    background?: boolean;
  }): Promise<void> {
    const ctx = await this.loadCaseContext(params.caseId);
    if (!ctx) return;

    const adminUserIds = await this.dispatch.findAdminUserIds();
    let stationDispatcherUserIds: string[] = [];
    if (ctx.stationId) {
      stationDispatcherUserIds = await this.dispatch.findDispatcherUserIdsByStation(ctx.stationId);
    } else if (ctx.regionId) {
      stationDispatcherUserIds = await this.dispatch.findDispatcherUserIdsByRegion(ctx.regionId);
    }

    const recipientUserIds = resolveCaseEventRecipientUserIds(
      params.event,
      ctx,
      adminUserIds,
      stationDispatcherUserIds,
    );

    if (!recipientUserIds.length) return;

    const content = buildCaseNotificationContent(params.event, ctx.trackingCode, ctx.priority);

    const payload = {
      eventKey: params.event as NotificationEventKey,
      title: content.title,
      message: content.message,
      type: 'EMERGENCY' as const,
      category: 'MISSION' as const,
      priority: content.priority,
      entityType: 'EmergencyRequest',
      entityId: ctx.caseId,
      redirectUrl: `/dispatcher/emergency-requests/${ctx.caseId}`,
      context: {
        createdById: params.actorUserId ?? undefined,
        directOnly: true,
        recipientUserIds,
        stationId: ctx.stationId ?? undefined,
        regionId: ctx.regionId ?? undefined,
      },
    };

    if (params.background !== false) {
      this.notifications.dispatchEventBackground(payload);
    } else {
      await this.notifications.dispatchEvent(payload);
    }
  }

  async notifyCaseStatusChange(params: {
    caseId: string;
    status: EmergencyRequestStatus;
    actorUserId?: string | null;
    background?: boolean;
  }): Promise<void> {
    const event = statusToCaseWorkflowEvent(params.status);
    if (!event) return;
    await this.notifyCaseEvent({
      caseId: params.caseId,
      event,
      actorUserId: params.actorUserId,
      background: params.background,
    });
  }
}
