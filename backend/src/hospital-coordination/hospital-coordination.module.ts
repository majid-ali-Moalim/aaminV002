import { Module } from '@nestjs/common';
import { HospitalCoordinationService } from './hospital-coordination.service';
import { HospitalCoordinationController } from './hospital-coordination.controller';
import { HospitalsModule } from '../hospitals/hospitals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HospitalsModule, NotificationsModule, AuthModule],
  controllers: [HospitalCoordinationController],
  providers: [HospitalCoordinationService],
  exports: [HospitalCoordinationService],
})
export class HospitalCoordinationModule {}
