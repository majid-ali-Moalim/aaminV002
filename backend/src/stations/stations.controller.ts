import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StationsService } from './stations.service';

@ApiTags('stations')
@Controller('stations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Station module dashboard overview' })
  getDashboard() {
    return this.stationsService.getDashboard();
  }

  @Get('coverage-map')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'District coverage by station' })
  getCoverageMap() {
    return this.stationsService.getCoverageMap();
  }

  @Get('transfers')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Station transfer history' })
  getTransfers(
    @Query('limit') limit?: string,
    @Query('stationId') stationId?: string,
    @Query('fromStationId') fromStationId?: string,
    @Query('toStationId') toStationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('reason') reason?: string,
    @Query('search') search?: string,
    @Query('priority') priority?: string,
    @Query('caseStatus') caseStatus?: string,
  ) {
    return this.stationsService.getTransfers({
      limit: limit ? parseInt(limit, 10) : 200,
      stationId,
      fromStationId,
      toStationId,
      startDate,
      endDate,
      reason,
      search,
      priority,
      caseStatus,
    });
  }

  @Get('ambulances')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Ambulances by station' })
  getAmbulances(@Query('stationId') stationId?: string) {
    return this.stationsService.getStationAmbulances(stationId);
  }

  @Get('staff')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Station staff (dispatchers, drivers, nurses)' })
  getStaff(
    @Query('stationId') stationId?: string,
    @Query('role') role?: string,
  ) {
    return this.stationsService.getStationStaff(stationId, role);
  }

  @Get('cases')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Active cases by station' })
  getCases(
    @Query('stationId') stationId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.stationsService.getActiveCases({ stationId, status, priority });
  }

  @Get('reports')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Full station reports bundle' })
  getFullReports() {
    return this.stationsService.getFullReports();
  }

  @Get('performance')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Station performance KPIs' })
  getPerformance(@Query('stationId') stationId?: string) {
    return this.stationsService.getPerformance(stationId);
  }

  @Get('suggest-transfer/:fromStationId')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Suggest nearest suitable station for transfer' })
  suggestTransfer(
    @Param('fromStationId') fromStationId: string,
    @Query('districtId') districtId?: string,
  ) {
    return this.stationsService.suggestTransferStation(fromStationId, districtId);
  }

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'All stations with operational counts' })
  findAll() {
    return this.stationsService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Station detail profile' })
  findOne(@Param('id') id: string) {
    return this.stationsService.findOne(id);
  }
}
