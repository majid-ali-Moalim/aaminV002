import { Module } from '@nestjs/common';
import { EmergencyRequestsController } from './emergency-requests.controller';
import { EmergencyRequestsService } from './emergency-requests.service';
import { TrackingModule } from '../tracking/tracking.module';
import { StationCoverageModule } from '../station-coverage/station-coverage.module';

@Module({
  imports: [TrackingModule, StationCoverageModule],
  controllers: [EmergencyRequestsController],
  providers: [EmergencyRequestsService],
  exports: [EmergencyRequestsService],
})
export class EmergencyRequestsModule {}
