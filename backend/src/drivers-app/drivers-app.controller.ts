import {
  Controller, Get, Post, Patch, Param, Body, Request,
  UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DriversAppService } from './drivers-app.service';
import { DriverAuthGuard } from './drivers-app.guard';

@ApiTags('driver-app')
@ApiBearerAuth()
@UseGuards(DriverAuthGuard)
@Controller('driver-app')
export class DriversAppController {
  constructor(private readonly service: DriversAppService) {}

  // ─── PROFILE ──────────────────────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({ summary: 'Get driver profile' })
  getProfile(@Request() req) {
    return this.service.getDriverProfile(req.user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update driver profile' })
  updateProfile(@Request() req, @Body() body: any) {
    return this.service.updateDriverProfile(req.user.sub, body);
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get driver dashboard stats' })
  getDashboard(@Request() req) {
    return this.service.getDashboardStats(req.user.sub);
  }

  // ─── SHIFT / AVAILABILITY ─────────────────────────────────────────────────

  @Get('shift')
  @ApiOperation({ summary: 'Get current shift status' })
  getShift(@Request() req) {
    return this.service.getShiftStatus(req.user.sub);
  }

  @Post('shift/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start shift' })
  startShift(@Request() req) {
    return this.service.startShift(req.user.sub);
  }

  @Post('shift/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End shift' })
  endShift(@Request() req) {
    return this.service.endShift(req.user.sub);
  }

  @Patch('availability')
  @ApiOperation({ summary: 'Toggle availability' })
  toggleAvailability(@Request() req, @Body() body: { available: boolean }) {
    return this.service.toggleAvailability(req.user.sub, body.available);
  }

  // ─── MISSIONS ─────────────────────────────────────────────────────────────

  @Get('missions/active')
  @ApiOperation({ summary: 'Get active mission' })
  getActiveMission(@Request() req) {
    return this.service.getActiveMission(req.user.sub);
  }

  @Get('missions/history')
  @ApiOperation({ summary: 'Get mission history' })
  getMissionHistory(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.service.getMissionHistory(
      req.user.sub,
      parseInt(page),
      parseInt(limit),
      status,
    );
  }

  @Get('missions/:id')
  @ApiOperation({ summary: 'Get mission by ID' })
  getMission(@Request() req, @Param('id') id: string) {
    return this.service.getMissionById(req.user.sub, id);
  }

  @Patch('missions/:id/status')
  @ApiOperation({ summary: 'Update mission status' })
  updateMissionStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.service.updateMissionStatus(req.user.sub, id, body.status, body.notes);
  }

  @Post('missions/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject assigned mission before dispatch' })
  rejectMission(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.rejectMissionAssignment(req.user.sub, id, body.reason);
  }

  // ─── AMBULANCE ────────────────────────────────────────────────────────────

  @Get('ambulance')
  @ApiOperation({ summary: 'Get assigned ambulance' })
  getAmbulance(@Request() req) {
    return this.service.getAssignedAmbulance(req.user.sub);
  }

  @Patch('ambulance/status')
  @ApiOperation({ summary: 'Update ambulance status' })
  updateAmbulanceStatus(@Request() req, @Body() body: { status: string }) {
    return this.service.updateAmbulanceStatus(req.user.sub, body.status);
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'Get driver notifications' })
  getNotifications(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.getNotifications(req.user.sub, parseInt(page), parseInt(limit));
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Request() req, @Param('id') id: string) {
    return this.service.markNotificationRead(req.user.sub, id);
  }

  @Post('notifications/mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Request() req) {
    return this.service.markAllNotificationsRead(req.user.sub);
  }
}
