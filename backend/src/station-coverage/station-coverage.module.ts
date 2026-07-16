import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StationCoverageService } from './station-coverage.service';
import { StationCoverageController } from './station-coverage.controller';

@Module({
  imports: [PrismaModule],
  providers: [StationCoverageService],
  controllers: [StationCoverageController],
  exports: [StationCoverageService],
})
export class StationCoverageModule {}
