import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemSetupModule } from '../system-setup/system-setup.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [PrismaModule, SystemSetupModule, SystemSettingsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
