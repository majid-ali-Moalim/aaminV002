import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { UploadsController } from './uploads.controller';
import { AccessControlModule } from '../access-control/access-control.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AccessControlModule, NotificationsModule],
  controllers: [EmployeesController, UploadsController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
