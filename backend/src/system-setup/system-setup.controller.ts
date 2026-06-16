import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemSetupService } from './system-setup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('system-setup')
@Controller('setup')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SystemSetupController {
  constructor(private readonly setupService: SystemSetupService) {}

  @Public()
  @Get('regions')
  @ApiOperation({ summary: 'Get all active regions' })
  getRegions() { return this.setupService.getRegions(); }

  @Public()
  @Get('districts')
  @ApiOperation({ summary: 'Get all active districts' })
  getDistricts(@Query('regionId') regionId?: string) { return this.setupService.getDistricts(regionId); }

  @Public()
  @Get('departments')
  @ApiOperation({ summary: 'Get all active departments' })
  getDepartments() { return this.setupService.getDepartments(); }

  @Public()
  @Get('roles')
  @ApiOperation({ summary: 'Get all active employee roles' })
  getEmployeeRoles() { return this.setupService.getEmployeeRoles(); }

  @Public()
  @Get('equipment-levels')
  @ApiOperation({ summary: 'Get all active equipment levels' })
  getEquipmentLevels() { return this.setupService.getEquipmentLevels(); }

  @Public()
  @Get('incident-categories')
  @ApiOperation({ summary: 'Get all active incident categories' })
  getIncidentCategories() { return this.setupService.getIncidentCategories(); }

  @Public()
  @Get('emergency-types')
  @ApiOperation({ summary: 'Get all active emergency types' })
  getEmergencyTypes() { return this.setupService.getEmergencyTypes(); }

  @Public()
  @Get('stations')
  @ApiOperation({ summary: 'Get all active stations' })
  getStations(@Query('districtId') districtId?: string) { return this.setupService.getStations(districtId); }

  @Public()
  @Get('coverage')
  @ApiOperation({ summary: 'Area and station coverage overview' })
  getCoverage() { return this.setupService.getCoverageOverview(); }

  @Public()
  @Get('areas')
  @ApiOperation({ summary: 'Get all active areas' })
  getAreas(@Query('districtId') districtId?: string) { return this.setupService.getAreas(districtId); }

  @Post(':model')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Creation for system setup data' })
  create(@Param('model') model: string, @Body() data: any) {
    return this.setupService.create(model, data);
  }

  @Patch(':model/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update for system setup data' })
  update(@Param('model') model: string, @Param('id') id: string, @Body() data: any) {
    return this.setupService.update(model, id, data);
  }

  @Delete(':model/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Archive system setup data' })
  remove(@Param('model') model: string, @Param('id') id: string) {
    return this.setupService.remove(model, id);
  }
}
