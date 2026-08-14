import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationDispatchService } from './notification-dispatch.service';
import { CaseWorkflowNotificationService } from './case-workflow-notification.service';
import { PushNotificationService } from './push-notification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  providers: [
    NotificationsService,
    NotificationsGateway,
    NotificationDispatchService,
    CaseWorkflowNotificationService,
    PushNotificationService,
  ],
  controllers: [NotificationsController],
  exports: [
    NotificationsService,
    NotificationsGateway,
    NotificationDispatchService,
    CaseWorkflowNotificationService,
    PushNotificationService,
  ],
})
export class NotificationsModule {}
