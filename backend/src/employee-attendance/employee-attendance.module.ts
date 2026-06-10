import { Module } from '@nestjs/common';
import { EmployeeAttendanceController } from './employee-attendance.controller';
import { EmployeeAttendanceService } from './employee-attendance.service';
@Module({
  controllers: [EmployeeAttendanceController],
  providers: [EmployeeAttendanceService],
  exports: [EmployeeAttendanceService],
})
export class EmployeeAttendanceModule {}
