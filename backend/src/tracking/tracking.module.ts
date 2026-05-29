import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER } from '@nestjs/core';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { TrackingGateway } from './tracking.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { EtaCalculationService } from './eta-calculation.service';
import { AuditLogService } from './audit-log.service';
import { TrackingAnalyticsService } from './tracking-analytics.service';
import { NotificationEventEmitter } from './notification-event-emitter.service';
import { GlobalTrackingExceptionFilter } from './tracking-exception.filter';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 120,
    }]),
  ],
  providers: [
    TrackingService, 
    TrackingGateway,
    EtaCalculationService,
    AuditLogService,
    TrackingAnalyticsService,
    NotificationEventEmitter,
    {
      provide: APP_FILTER,
      useClass: GlobalTrackingExceptionFilter,
    }
  ],
  controllers: [TrackingController],
  exports: [TrackingGateway, TrackingService, AuditLogService, NotificationEventEmitter]
})
export class TrackingModule {}
