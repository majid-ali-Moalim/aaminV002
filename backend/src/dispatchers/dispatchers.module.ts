import { Module } from '@nestjs/common';
import { DispatchersService } from './dispatchers.service';
import { DispatchersController } from './dispatchers.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DispatchersController],
  providers: [DispatchersService],
  exports: [DispatchersService],
})
export class DispatchersModule {}
