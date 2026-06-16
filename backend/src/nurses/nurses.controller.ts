import { Controller, Get, Post, Put, Body, Param, Query, Patch } from '@nestjs/common';
import { NursesService } from './nurses.service';

@Controller('nurses')
export class NursesController {
  constructor(private readonly nursesService: NursesService) {}

  @Get()
  async findAll(
    @Query('stationId') stationId?: string,
    @Query('status') status?: string,
    @Query('shiftStatus') shiftStatus?: string,
    @Query('searchTerm') searchTerm?: string,
  ) {
    return this.nursesService.findAll({ stationId, status, shiftStatus, searchTerm });
  }

  @Get('stats')
  async getStats() {
    return this.nursesService.getStats();
  }

  @Get('assignments')
  async getAssignments() {
    return this.nursesService.getAssignments();
  }

  @Get('reports/patient-care')
  async getPatientCareRecords(@Query('nurseId') nurseId?: string) {
    return this.nursesService.getPatientCareRecords(nurseId);
  }

  @Get('reports/incidents')
  async getIncidentReports(@Query('nurseId') nurseId?: string) {
    return this.nursesService.getIncidentReports(nurseId);
  }

  @Post('records')
  async createPatientCareRecord(@Body() data: any) {
    return this.nursesService.createPatientCareRecord(data);
  }

  @Post('incidents')
  async createIncidentReport(@Body() data: any) {
    return this.nursesService.createIncidentReport(data);
  }

  @Get('availability/overview')
  async getAvailabilityOverview() {
    return this.nursesService.getAvailabilityOverview();
  }

  @Get('availability/:id/detail')
  async getAvailabilityDetail(@Param('id') id: string) {
    return this.nursesService.getAvailabilityDetail(id);
  }

  @Get(':id/performance')
  async getPerformance(@Param('id') id: string) {
    return this.nursesService.getPerformance(id);
  }

  @Post(':id/shift')
  async updateShiftStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.nursesService.updateShiftStatus(id, status, notes);
  }

  @Patch(':id/clearance')
  async updateMedicalStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.nursesService.updateMedicalStatus(id, status);
  }

  @Put(':id/ambulance')
  async assignAmbulance(
    @Param('id') id: string,
    @Body('ambulanceId') ambulanceId: string | null,
  ) {
    return this.nursesService.assignAmbulance(id, ambulanceId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.nursesService.findOne(id);
  }
}
