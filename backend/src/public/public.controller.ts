import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PublicService } from './public.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Public-facing operational statistics for marketing pages' })
  getStats() {
    return this.publicService.getPublicStats();
  }

  @Public()
  @Get('emergency-types')
  @ApiOperation({ summary: 'Active emergency types for public hire-ambulance form' })
  getEmergencyTypes() {
    return this.publicService.getEmergencyTypes();
  }

  @Public()
  @Get('fleet/availability')
  @ApiOperation({ summary: 'Ambulance fleet availability for public hire form' })
  getFleetAvailability() {
    return this.publicService.getFleetAvailability();
  }
}
