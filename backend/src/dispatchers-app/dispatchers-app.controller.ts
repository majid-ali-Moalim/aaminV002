import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Request,
  UseGuards,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DispatchersAppService } from './dispatchers-app.service';
import { DispatcherAuthGuard } from './dispatchers-app.guard';

@ApiTags('dispatcher-app')
@ApiBearerAuth()
@UseGuards(DispatcherAuthGuard)
@Controller('dispatcher-app')
export class DispatchersAppController {
  constructor(private readonly service: DispatchersAppService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get dispatcher profile (admin-issued credentials)' })
  getProfile(@Request() req) {
    return this.service.getProfile(req.user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update dispatcher profile' })
  updateProfile(@Request() req, @Body() body: Record<string, unknown>) {
    return this.service.updateProfile(req.user.sub, body);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Dispatcher command center stats (my cases + regional resources)' })
  getDashboard(@Request() req) {
    return this.service.getDashboardStats(req.user.sub);
  }

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Dashboard overview scoped to cases this dispatcher handles' })
  getDashboardOverview(@Request() req) {
    return this.service.getDashboardOverview(req.user.sub);
  }

  @Get('shift')
  getShift(@Request() req) {
    return this.service.getShiftStatus(req.user.sub);
  }

  @Post('shift/start')
  @HttpCode(HttpStatus.OK)
  startShift(@Request() req) {
    return this.service.startShift(req.user.sub);
  }

  @Post('shift/end')
  @HttpCode(HttpStatus.OK)
  endShift(@Request() req) {
    return this.service.endShift(req.user.sub);
  }

  @Patch('availability')
  toggleAvailability(@Request() req, @Body() body: { available: boolean }) {
    return this.service.toggleAvailability(req.user.sub, body.available);
  }

  @Get('cases')
  getMyCases(@Request() req, @Query('status') status?: string) {
    return this.service.getMyCases(req.user.sub, status);
  }

  @Get('queue/pending')
  getPendingQueue(@Request() req) {
    return this.service.getPendingQueue(req.user.sub);
  }

  @Get('missions/active')
  getActiveMissions(@Request() req) {
    return this.service.getActiveMissions(req.user.sub);
  }

  @Get('fleet')
  getFleet(@Request() req) {
    return this.service.getFleetOverview(req.user.sub);
  }

  @Get('staff')
  getStaff(@Request() req) {
    return this.service.getStaffOverview(req.user.sub);
  }

  @Get('emergencies')
  getEmergencies(@Request() req, @Query('view') view = 'all-cases') {
    return this.service.getEmergenciesByView(req.user.sub, view);
  }

  @Get('ambulances')
  getAmbulances(@Request() req, @Query('view') view = 'all') {
    return this.service.getAmbulancesByView(req.user.sub, view);
  }

  @Get('crew')
  getCrew(@Request() req, @Query('view') view = 'drivers') {
    return this.service.getCrewByView(req.user.sub, view);
  }

  @Get('hospitals')
  getHospitals(@Request() req, @Query('view') view = 'directory') {
    return this.service.getHospitalsByView(req.user.sub, view);
  }

  @Get('alerts/feed')
  getAlerts(@Request() req, @Query('view') view = 'critical') {
    return this.service.getAlertsByView(req.user.sub, view);
  }

  @Get('available/assign')
  getAssignable(@Request() req) {
    return this.service.getAssignableResources(req.user.sub);
  }

  @Get('notifications')
  getNotifications(@Request() req, @Query('view') view = 'all') {
    return this.service.getCaseNotifications(req.user.sub, view);
  }

  @Get('reports/:type')
  getReports(@Request() req, @Param('type') type: string) {
    return this.service.getReports(req.user.sub, type || 'emergency');
  }
}
