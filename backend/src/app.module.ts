import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { EmployeesModule } from './employees/employees.module';
import { PatientsModule } from './patients/patients.module';
import { AmbulancesModule } from './ambulances/ambulances.module';
import { EmergencyRequestsModule } from './emergency-requests/emergency-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SystemSetupModule } from './system-setup/system-setup.module';
import { ReportsModule } from './reports/reports.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { DriversModule } from './drivers/drivers.module';
import { NursesModule } from './nurses/nurses.module';
import { DispatchersModule } from './dispatchers/dispatchers.module';
import { TrackingModule } from './tracking/tracking.module';
import { DriversAppModule } from './drivers-app/drivers-app.module';
import { DispatchersAppModule } from './dispatchers-app/dispatchers-app.module';
import { UsersModule } from './users/users.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';

import { AccessControlModule } from './access-control/access-control.module';
import { MasterDataModule } from './master-data/master-data.module';
import { HospitalCoordinationModule } from './hospital-coordination/hospital-coordination.module';
import { EmployeeAttendanceModule } from './employee-attendance/employee-attendance.module';
import { HospitalAppModule } from './hospital-app/hospital-app.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    PatientsModule,
    AmbulancesModule,
    EmergencyRequestsModule,
    NotificationsModule,
    SystemSetupModule,
    ReportsModule,
    HospitalsModule,
    DriversModule,
    NursesModule,
    DispatchersModule,
    TrackingModule,
    DriversAppModule,
    DispatchersAppModule,
    UsersModule,
    ActivityLogsModule,
    AccessControlModule,
    MasterDataModule,
    HospitalCoordinationModule,
    EmployeeAttendanceModule,
    HospitalAppModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
