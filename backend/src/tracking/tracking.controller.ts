import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TrackingService } from './tracking.service';

@UseGuards(ThrottlerGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get(':query')
  async trackPatient(@Param('query') query: string) {
    return this.trackingService.findByCodeOrPhone(query);
  }
}
