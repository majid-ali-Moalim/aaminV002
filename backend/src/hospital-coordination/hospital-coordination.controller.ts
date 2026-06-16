import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HospitalCoordinationService } from './hospital-coordination.service';
import { HospitalsService } from '../hospitals/hospitals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { HospitalCaseStage, HospitalRefusalReason, HospitalCaseStatus } from '@prisma/client';

@ApiTags('hospital-coordination')
@Controller('hospital-coordination')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class HospitalCoordinationController {
  constructor(
    private readonly coordination: HospitalCoordinationService,
    private readonly hospitals: HospitalsService,
  ) {}

  @Get('overview')
  @RequirePermissions('hospital.view')
  overview() {
    return this.coordination.getOverview();
  }

  @Get('hospitals')
  @RequirePermissions('hospital.view')
  listHospitals(
    @Query('search') search?: string,
    @Query('regionId') regionId?: string,
    @Query('districtId') districtId?: string,
    @Query('hospitalType') hospitalType?: string,
    @Query('status') status?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.coordination.listHospitals({
      search,
      regionId,
      districtId,
      hospitalType,
      status,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Patch('hospitals/:id/availability')
  @RequirePermissions('hospital.manage')
  updateAvailability(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.coordination.updateAvailability(id, body, user?.id);
  }

  @Patch('hospitals/:id/activate')
  @RequirePermissions('hospital.manage')
  activate(@Param('id') id: string) {
    return this.hospitals.update(id, { isActive: true });
  }

  @Patch('hospitals/:id/deactivate')
  @RequirePermissions('hospital.manage')
  deactivate(@Param('id') id: string) {
    return this.hospitals.update(id, { isActive: false });
  }

  @Get('cases')
  @RequirePermissions('hospital.view')
  listCases(
    @Query('stage') stage?: HospitalCaseStage,
    @Query('status') status?: string,
    @Query('hospitalId') hospitalId?: string,
    @Query('search') search?: string,
    @Query('regionId') regionId?: string,
    @Query('districtId') districtId?: string,
  ) {
    return this.coordination.listCases({
      stage,
      status: status?.includes(',')
        ? (status.split(',') as HospitalCaseStatus[])
        : (status as HospitalCaseStatus),
      hospitalId,
      search,
      regionId,
      districtId,
    });
  }

  @Get('cases/:id')
  @RequirePermissions('hospital.view')
  getCase(@Param('id') id: string) {
    return this.coordination.getCase(id);
  }

  @Patch('cases/:id/accept')
  @RequirePermissions('hospital.handover')
  accept(@Param('id') id: string, @Body() body: { receivingStaffName?: string }, @CurrentUser() user: any) {
    return this.coordination.acceptCase(id, user?.id, body.receivingStaffName);
  }

  @Patch('cases/:id/reject')
  @RequirePermissions('hospital.handover')
  reject(
    @Param('id') id: string,
    @Body() body: { reason: HospitalRefusalReason; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.coordination.rejectCase(id, body.reason, body.notes, user?.id);
  }

  @Patch('cases/:id/handover-queue')
  @RequirePermissions('hospital.handover')
  moveToHandover(@Param('id') id: string, @CurrentUser() user: any) {
    return this.coordination.moveToHandover(id, user?.id);
  }

  @Patch('cases/:id/handover/start')
  @RequirePermissions('hospital.handover')
  startHandover(@Param('id') id: string, @CurrentUser() user: any) {
    return this.coordination.startHandover(id, user?.id);
  }

  @Patch('cases/:id/handover/complete')
  @RequirePermissions('hospital.handover')
  completeHandover(
    @Param('id') id: string,
    @Body() body: { receivingStaffName?: string; department?: string; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.coordination.completeHandover(id, user?.id, body);
  }

  @Patch('cases/:id/status')
  @RequirePermissions('hospital.handover')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: HospitalCaseStatus },
    @CurrentUser() user: any,
  ) {
    return this.coordination.updateCaseStatus(id, body.status, user?.id);
  }

  @Get('analytics')
  @RequirePermissions('hospital.view')
  analytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('hospitalId') hospitalId?: string,
    @Query('regionId') regionId?: string,
  ) {
    return this.coordination.getAnalytics({ startDate, endDate, hospitalId, regionId });
  }
}
