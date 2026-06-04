import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivityLogsService } from './activity-logs.service';

@ApiTags('activity-logs')
@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List activity audit logs' })
  findAll(
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('since') since?: string,
  ) {
    return this.activityLogsService.findAll({
      limit: limit ? parseInt(limit, 10) : undefined,
      entityType,
      userId,
      since: since ? new Date(since) : undefined,
    });
  }
}
