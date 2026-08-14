import { Test, TestingModule } from '@nestjs/testing';
import { CaseWorkflowNotificationService } from './case-workflow-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';

describe('CaseWorkflowNotificationService', () => {
  let service: CaseWorkflowNotificationService;
  const prisma = {
    emergencyRequest: {
      findUnique: jest.fn(),
    },
  };
  const notifications = {
    dispatchEvent: jest.fn(),
    dispatchEventBackground: jest.fn(),
  };
  const dispatch = {
    findAdminUserIds: jest.fn(),
    findDispatcherUserIdsByStation: jest.fn(),
    findDispatcherUserIdsByRegion: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    dispatch.findAdminUserIds.mockResolvedValue(['admin-1']);
    dispatch.findDispatcherUserIdsByStation.mockResolvedValue(['dispatcher-station']);
    prisma.emergencyRequest.findUnique.mockResolvedValue({
      id: 'case-1',
      trackingCode: 'CASE-2026-0019',
      priority: 'HIGH',
      stationId: 'station-1',
      regionId: 'region-1',
      driver: { userId: 'driver-1' },
      nurse: { userId: 'nurse-1' },
      dispatcher: { userId: 'dispatcher-1' },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseWorkflowNotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: NotificationDispatchService, useValue: dispatch },
      ],
    }).compile();

    service = module.get(CaseWorkflowNotificationService);
  });

  it('dispatches NEW_EMERGENCY_REQUEST to admin and dispatcher', async () => {
    await service.notifyCaseEvent({
      caseId: 'case-1',
      event: 'NEW_EMERGENCY_REQUEST',
      actorUserId: 'actor-1',
      background: false,
    });

    expect(notifications.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'NEW_EMERGENCY_REQUEST',
        entityId: 'case-1',
        context: expect.objectContaining({
          directOnly: true,
          recipientUserIds: expect.arrayContaining(['admin-1', 'dispatcher-1']),
        }),
      }),
    );
    const payload = notifications.dispatchEvent.mock.calls[0][0];
    expect(payload.context.recipientUserIds).not.toContain('driver-1');
    expect(payload.context.recipientUserIds).not.toContain('nurse-1');
  });

  it('dispatches CREW_ASSIGNED to assigned crew', async () => {
    await service.notifyCaseEvent({
      caseId: 'case-1',
      event: 'CREW_ASSIGNED',
      background: false,
    });

    const payload = notifications.dispatchEvent.mock.calls[0][0];
    expect(payload.context.recipientUserIds).toEqual(
      expect.arrayContaining(['driver-1', 'nurse-1', 'dispatcher-1', 'admin-1']),
    );
  });

  it('maps status change to workflow event', async () => {
    await service.notifyCaseStatusChange({
      caseId: 'case-1',
      status: 'ARRIVED_SCENE',
      background: false,
    });

    expect(notifications.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventKey: 'ARRIVED_SCENE' }),
    );
  });
});
