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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmergencyRequestsService } from './emergency-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { EmergencyRequestStatus } from '@prisma/client';

@ApiTags('emergency-requests')
@Controller('emergency-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmergencyRequestsController {
  constructor(private readonly emergencyRequestsService: EmergencyRequestsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new emergency request' })
  create(@Body() createEmergencyRequestDto: any, @Request() req) {
    if (req.user?.sub) createEmergencyRequestDto.createdByUserId = req.user.sub;
    if (req.user?.employeeId) createEmergencyRequestDto.submitterEmployeeId = req.user.employeeId;
    return this.emergencyRequestsService.create(createEmergencyRequestDto);
  }

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Get all emergency requests' })
  @ApiQuery({
    name: 'queue',
    required: false,
    enum: ['pending', 'my-active', 'my-cases', 'regional'],
    description: 'Dispatcher queue filter: pending (regional unassigned), my-active (your missions), my-cases (all yours)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active'],
    description: 'When active, return only in-progress mission statuses',
  })
  findAll(@Request() req, @Query('queue') queue?: string, @Query('status') status?: string) {
    return this.emergencyRequestsService.findAllForUser(req.user, queue, status);
  }

  @Public()
  @Get('track/:trackingCode')
  @ApiOperation({ summary: 'Track emergency request by tracking code' })
  findByTrackingCode(@Param('trackingCode') trackingCode: string) {
    return this.emergencyRequestsService.findByTrackingCode(trackingCode);
  }

  @Get('dashboard/stats')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getDashboardStats() {
    return this.emergencyRequestsService.getDashboardStats();
  }

  @Public()
  @Get('available/ambulances')
  @ApiOperation({ summary: 'Get available ambulances' })
  @ApiQuery({ name: 'excludeCaseId', required: false, description: 'Exclude crew busy on this case (reassign)' })
  @ApiQuery({ name: 'stationId', required: false, description: 'Filter to a specific station' })
  getAvailableAmbulances(
    @Query('excludeCaseId') excludeCaseId?: string,
    @Query('stationId') stationId?: string,
  ) {
    return this.emergencyRequestsService.getAvailableAmbulances(excludeCaseId, stationId);
  }

  @Public()
  @Get('available/drivers')
  @ApiOperation({ summary: 'Get available drivers' })
  @ApiQuery({ name: 'excludeCaseId', required: false, description: 'Exclude crew busy on this case (reassign)' })
  @ApiQuery({ name: 'stationId', required: false, description: 'Filter to a specific station' })
  @ApiQuery({ name: 'includeIneligible', required: false, description: 'Include excluded crew with reasons (admin debug)' })
  getAvailableDrivers(
    @Query('excludeCaseId') excludeCaseId?: string,
    @Query('stationId') stationId?: string,
    @Query('includeIneligible') includeIneligible?: string,
  ) {
    return this.emergencyRequestsService.getAvailableDrivers(
      excludeCaseId,
      stationId,
      includeIneligible === 'true',
    );
  }
 
  @Public()
  @Get('available/nurses')
  @ApiOperation({ summary: 'Get available nurses' })
  @ApiQuery({ name: 'excludeCaseId', required: false, description: 'Exclude crew busy on this case (reassign)' })
  @ApiQuery({ name: 'stationId', required: false, description: 'Filter to a specific station' })
  @ApiQuery({ name: 'includeIneligible', required: false, description: 'Include excluded crew with reasons (admin debug)' })
  getAvailableNurses(
    @Query('excludeCaseId') excludeCaseId?: string,
    @Query('stationId') stationId?: string,
    @Query('includeIneligible') includeIneligible?: string,
  ) {
    return this.emergencyRequestsService.getAvailableNurses(
      excludeCaseId,
      stationId,
      includeIneligible === 'true',
    );
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER', 'NURSE')
  @ApiOperation({ summary: 'Get emergency request by ID' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.emergencyRequestsService.findOne(id, req.user);
  }

  @Patch(':id/assign')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Assign ambulance and driver to emergency request' })
  assign(@Param('id') id: string, @Body() assignDto: any, @Request() req) {
    if (
      req.user?.role === 'EMPLOYEE' &&
      req.user?.employeeId &&
      !assignDto.dispatcherId
    ) {
      assignDto.dispatcherId = req.user.employeeId;
    }
    return this.emergencyRequestsService.assign(id, assignDto, req.user);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER', 'NURSE')
  @ApiOperation({ summary: 'Update emergency request status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: { status: string },
    @Request() req,
  ) {
    return this.emergencyRequestsService.updateStatus(
      id,
      updateStatusDto.status as EmergencyRequestStatus,
      req.user?.employeeId,
      req.user,
    );
  }

  @Patch(':id/cancel')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Cancel emergency request' })
  cancel(@Param('id') id: string, @Body() cancelDto: { reason: string }, @Request() req) {
    return this.emergencyRequestsService.cancelRequest(
      id,
      cancelDto.reason,
      req.user?.employeeId,
      req.user,
    );
  }

  @Patch(':id/complete')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Mark emergency request completed with dispatcher closure summary' })
  complete(
    @Param('id') id: string,
    @Body()
    completeDto: {
      acceptedHospital?: string
      rejectedHospitals?: string
      consciousStatus?: string
      breathingStatus?: string
      bleedingStatus?: string
      patientConditionAtClose?: string
      receivingStaff?: string
      treatmentSummary?: string
      handoverNotes?: string
      dispatcherNotes?: string
    },
    @Request() req,
  ) {
    return this.emergencyRequestsService.completeRequest(
      id,
      completeDto,
      req.user?.employeeId,
      req.user,
    );
  }

  @Patch(':id/fail')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Mark emergency request as failed' })
  markFailed(@Param('id') id: string, @Body() failDto: { reason: string }) {
    return this.emergencyRequestsService.markFailed(id, failDto.reason);
  }

  @Patch(':id/escalate')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Escalate emergency request' })
  escalate(@Param('id') id: string, @Body() escalateDto: { reason?: string }) {
    return this.emergencyRequestsService.escalateRequest(id, escalateDto.reason);
  }

  @Patch(':id/transfer-station')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Transfer case to another ambulance station' })
  transferStation(
    @Param('id') id: string,
    @Body() dto: { toStationId: string; reason: string },
    @Request() req,
  ) {
    return this.emergencyRequestsService.transferCaseStation(id, dto, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Update emergency request' })
  update(@Param('id') id: string, @Body() updateEmergencyRequestDto: any) {
    return this.emergencyRequestsService.update(id, updateEmergencyRequestDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete emergency request' })
  remove(@Param('id') id: string) {
    return this.emergencyRequestsService.delete(id);
  }
}
