import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { DriversService } from './drivers.service';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  async findAll(
    @Query('stationId') stationId?: string,
    @Query('status') status?: string,
    @Query('shiftStatus') shiftStatus?: string,
    @Query('searchTerm') searchTerm?: string,
  ) {
    return this.driversService.findAll({ stationId, status, shiftStatus, searchTerm });
  }

  @Get('stats')
  async getStats() {
    return this.driversService.getStats();
  }

  @Get('performance')
  async getPerformance() {
    return this.driversService.getPerformance();
  }

  @Get('attendance')
  async getAttendance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.driversService.getAttendance({ startDate, endDate });
  }

  @Post(':id/check-in')
  async checkIn(
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.driversService.checkIn(id, notes);
  }

  @Post(':id/check-out')
  async checkOut(
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    return this.driversService.checkOut(id, notes);
  }

  @Post(':id/shift')
  async updateShiftStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.driversService.updateShiftStatus(id, status, notes);
  }

  @Put(':id/ambulance')
  async assignAmbulance(
    @Param('id') id: string,
    @Body('ambulanceId') ambulanceId: string | null,
  ) {
    return this.driversService.assignAmbulance(id, ambulanceId);
  }

  @Get('availability/overview')
  async getAvailabilityOverview() {
    return this.driversService.getAvailabilityOverview();
  }

  @Get('availability/:id/detail')
  async getAvailabilityDetail(@Param('id') id: string) {
    return this.driversService.getAvailabilityDetail(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }
}
