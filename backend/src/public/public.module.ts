import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemSetupModule } from '../system-setup/system-setup.module';

@Module({
  imports: [PrismaModule, SystemSetupModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
