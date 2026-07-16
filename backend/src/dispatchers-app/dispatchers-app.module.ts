import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DispatchersAppController } from './dispatchers-app.controller';
import { DispatchersAppService } from './dispatchers-app.service';
import { DispatcherAuthGuard } from './dispatchers-app.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AccessControlModule } from '../access-control/access-control.module';

import { StationCoverageModule } from '../station-coverage/station-coverage.module';

@Module({
  imports: [
    PrismaModule,
    AccessControlModule,
    StationCoverageModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [DispatchersAppController],
  providers: [DispatchersAppService, DispatcherAuthGuard],
  exports: [DispatchersAppService],
})
export class DispatchersAppModule {}
