import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchersService } from './dispatchers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('dispatchers')
@Controller('dispatchers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DispatchersController {
  constructor(private readonly dispatchersService: DispatchersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all dispatchers' })
  findAll(
    @Query('stationId') stationId?: string,
    @Query('status') status?: string,
    @Query('shiftStatus') shiftStatus?: string,
    @Query('searchTerm') searchTerm?: string,
  ) {
    return this.dispatchersService.findAll({ stationId, status, shiftStatus, searchTerm });
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Dispatcher workforce stats' })
  getStats() {
    return this.dispatchersService.getStats();
  }
}
