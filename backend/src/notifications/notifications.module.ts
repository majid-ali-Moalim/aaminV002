import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationDispatchService } from './notification-dispatch.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  providers: [NotificationsService, NotificationsGateway, NotificationDispatchService],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationsGateway, NotificationDispatchService],
})
export class NotificationsModule {}
