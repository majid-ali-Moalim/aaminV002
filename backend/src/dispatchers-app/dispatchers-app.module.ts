import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DispatchersAppController } from './dispatchers-app.controller';
import { DispatchersAppService } from './dispatchers-app.service';
import { DispatcherAuthGuard } from './dispatchers-app.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
  ],
  controllers: [DispatchersAppController],
  providers: [DispatchersAppService, DispatcherAuthGuard],
  exports: [DispatchersAppService],
})
export class DispatchersAppModule {}
