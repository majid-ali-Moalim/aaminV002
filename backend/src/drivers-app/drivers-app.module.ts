import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DriversAppService } from './drivers-app.service';
import { DriversAppController } from './drivers-app.controller';
import { DriversAppGateway } from './drivers-app.gateway';
import { DriverAuthGuard } from './drivers-app.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [DriversAppController],
  providers: [DriversAppService, DriversAppGateway, DriverAuthGuard],
  exports: [DriversAppGateway],
})
export class DriversAppModule {}
