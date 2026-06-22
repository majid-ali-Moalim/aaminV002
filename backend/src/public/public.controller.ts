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
}
