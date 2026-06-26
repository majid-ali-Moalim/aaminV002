import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EmployeeAttendanceService } from './employee-attendance.service';

@ApiTags('employee-attendance')
@Controller('employee-attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('ADMIN')
export class EmployeeAttendanceController {
  constructor(private readonly service: EmployeeAttendanceService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('records')
  getRecords(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('departmentId') departmentId?: string,
    @Query('shift') shift?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getRecords({
      search,
      role,
      departmentId,
      shift,
      status,
      startDate,
      endDate,
    });
  }

  @Get('today')
  getToday() {
    return this.service.getDayAttendance();
  }

  @Get('day')
  getByDay(@Query('date') date?: string) {
    return this.service.getDayAttendance(date);
  }

  @Get('shifts')
  getShifts() {
    return this.service.getShiftManagement();
  }

  @Get('work-shifts')
  listWorkShifts() {
    return this.service.listWorkShifts(false);
  }

  @Post('work-shifts')
  createWorkShift(
    @Body()
    body: {
      code: string;
      name: string;
      startTime: string;
      endTime: string;
      description?: string;
      gracePeriodMins?: number;
      breakMinutes?: number;
      color?: string;
    },
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.createWorkShift(body, req.user.sub);
  }

  @Patch('work-shifts/:id')
  updateWorkShift(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.updateWorkShift(id, body as any, req.user.sub);
  }

  @Delete('work-shifts/:id')
  deleteWorkShift(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.service.deleteWorkShift(id, req.user.sub);
  }

  @Get('approvals')
  getApprovals(@Query('status') status?: string) {
    return this.service.getApprovals(status);
  }

  @Patch('approvals/:id')
  reviewApproval(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reviewerComment?: string },
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.reviewApproval(id, body.action, body.reviewerComment, req.user.sub);
  }

  @Get('leave')
  getLeave(@Query('status') status?: string) {
    return this.service.getLeaveRequests(status);
  }

  @Patch('leave/:id')
  reviewLeave(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reviewerComment?: string },
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.reviewLeave(id, body.action, body.reviewerComment, req.user.sub);
  }

  @Get('overtime')
  getOvertime(@Query('status') status?: string) {
    return this.service.getOvertime(status);
  }

  @Patch('overtime/:id')
  reviewOvertime(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' },
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.reviewOvertime(id, body.action, req.user.sub);
  }

  @Get('analytics')
  getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getAnalytics({ startDate, endDate });
  }

  @Get('roles/:roleKey')
  getRoleMonitoring(@Param('roleKey') roleKey: string) {
    return this.service.getRoleMonitoring(roleKey);
  }

  @Patch('records/:id')
  updateRecord(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Request() req: { user: { sub: string } },
  ) {
    return this.service.updateRecord(id, body, req.user.sub);
  }

  @Post('export')
  exportReport(
    @Body() body: { type: string; startDate?: string; endDate?: string },
  ) {
    return this.service.buildExportPayload(body);
  }
}
