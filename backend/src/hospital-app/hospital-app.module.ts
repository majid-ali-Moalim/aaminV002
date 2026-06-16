import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HospitalAppController } from './hospital-app.controller';
import { HospitalAppService } from './hospital-app.service';
import { HospitalAuthGuard } from './hospital-app.guard';
import { HospitalCoordinationModule } from '../hospital-coordination/hospital-coordination.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
    HospitalCoordinationModule,
    TrackingModule,
  ],
  controllers: [HospitalAppController],
  providers: [HospitalAppService, HospitalAuthGuard],
  exports: [HospitalAppService],
})
export class HospitalAppModule {}
