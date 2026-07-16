import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StationCoverageService } from './station-coverage.service';

@ApiTags('station-coverage')
@Controller('setup/stations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StationCoverageController {
  constructor(private readonly stationCoverage: StationCoverageService) {}

  @Get('suggest')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Suggest responsible station for a patient district' })
  @ApiQuery({ name: 'districtId', required: true })
  @ApiQuery({ name: 'regionId', required: false })
  suggest(
    @Query('districtId') districtId: string,
    @Query('regionId') regionId?: string,
  ) {
    return this.stationCoverage.suggestStationForDistrict(districtId, regionId);
  }

  @Get('coverage-mode')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Whether the system uses multi-station scoping' })
  coverageMode() {
    return this.stationCoverage.usesStationScoping().then((multiStation) => ({
      multiStation,
    }));
  }
}
