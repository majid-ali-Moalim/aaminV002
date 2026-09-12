import { Module } from '@nestjs/common';
import { EmergencyRequestsController } from './emergency-requests.controller';
import { EmergencyRequestsService } from './emergency-requests.service';
import { BookingReminderService } from './booking-reminder.service';
import { TrackingModule } from '../tracking/tracking.module';
import { StationCoverageModule } from '../station-coverage/station-coverage.module';
import { DriversAppModule } from '../drivers-app/drivers-app.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TrackingModule, StationCoverageModule, DriversAppModule, NotificationsModule],
  controllers: [EmergencyRequestsController],
  providers: [EmergencyRequestsService, BookingReminderService],
  exports: [EmergencyRequestsService],
})
export class EmergencyRequestsModule {}
