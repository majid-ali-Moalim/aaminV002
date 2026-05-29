import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Request,
  UseGuards,
  Query,
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
  @ApiOperation({ summary: 'Dispatcher command center stats' })
  getDashboard(@Request() req) {
    return this.service.getDashboardStats(req.user.sub);
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
  getPendingQueue() {
    return this.service.getPendingQueue();
  }

  @Get('missions/active')
  getActiveMissions() {
    return this.service.getActiveMissions();
  }

  @Get('fleet')
  getFleet() {
    return this.service.getFleetOverview();
  }

  @Get('staff')
  getStaff() {
    return this.service.getStaffOverview();
  }
}
