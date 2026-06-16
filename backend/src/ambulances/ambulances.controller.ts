import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AmbulancesService } from './ambulances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AmbulanceStatus } from '@prisma/client';

@ApiTags('ambulances')
@Controller('ambulances')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AmbulancesController {
  constructor(private readonly ambulancesService: AmbulancesService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new ambulance' })
  create(@Body() createAmbulanceDto: any) {
    return this.ambulancesService.create(createAmbulanceDto);
  }

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Get all ambulances' })
  findAll() {
    return this.ambulancesService.findAll();
  }

  @Get('status/:status')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Get ambulances by status' })
  findByStatus(@Param('status') status: string) {
    if (!Object.values(AmbulanceStatus).includes(status as AmbulanceStatus)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${Object.values(AmbulanceStatus).join(', ')}`);
    }
    return this.ambulancesService.findByStatus(status as AmbulanceStatus);
  }

  @Get('availability/overview')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Ambulance availability dashboard data' })
  getAvailabilityOverview() {
    return this.ambulancesService.getAvailabilityOverview();
  }

  @Get('availability/:id/detail')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Ambulance availability detail with case history' })
  getAvailabilityDetail(@Param('id') id: string) {
    return this.ambulancesService.getAvailabilityDetail(id);
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @ApiOperation({ summary: 'Get ambulance by ID' })
  findOne(@Param('id') id: string) {
    return this.ambulancesService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Update ambulance' })
  update(@Param('id') id: string, @Body() updateAmbulanceDto: any) {
    return this.ambulancesService.update(id, updateAmbulanceDto);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Update ambulance status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: AmbulanceStatus }) {
    const { status } = body
    if (!Object.values(AmbulanceStatus).includes(status)) {
      throw new BadRequestException(`Invalid status. Must be one of: ${Object.values(AmbulanceStatus).join(', ')}`);
    }
    return this.ambulancesService.updateStatus(id, status);
  }

  @Patch(':id/assign-driver')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Assign driver to ambulance' })
  assignDriver(@Param('id') id: string, @Body() body: { driverEmployeeId: string }) {
    if (!body.driverEmployeeId) {
      throw new BadRequestException('driverEmployeeId is required');
    }
    return this.ambulancesService.assignDriver(id, body.driverEmployeeId);
  }

  @Patch(':id/assign-nurse')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Assign nurse to ambulance' })
  assignNurse(@Param('id') id: string, @Body() body: { nurseEmployeeId: string }) {
    if (!body.nurseEmployeeId) {
      throw new BadRequestException('nurseEmployeeId is required');
    }
    return this.ambulancesService.assignNurse(id, body.nurseEmployeeId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete ambulance' })
  remove(@Param('id') id: string) {
    return this.ambulancesService.delete(id);
  }
}
