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
import { HospitalAppService } from './hospital-app.service';
import { HospitalAuthGuard } from './hospital-app.guard';
import { HospitalCoordinationService } from '../hospital-coordination/hospital-coordination.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { HospitalRefusalReason } from '@prisma/client';

@ApiTags('hospital-app')
@Controller('hospital-app')
@UseGuards(HospitalAuthGuard)
@ApiBearerAuth()
export class HospitalAppController {
  constructor(
    private readonly app: HospitalAppService,
    private readonly coordination: HospitalCoordinationService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Hospital profile and account' })
  profile(@CurrentUser() user: any) {
    return this.app.getProfile(user);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Hospital dashboard KPIs and activity' })
  dashboard(@CurrentUser() user: any) {
    return this.app.getDashboard(user);
  }

  @Get('cases')
  @ApiOperation({ summary: 'Emergency cases for this hospital' })
  cases(
    @CurrentUser() user: any,
    @Query('tab') tab?: string,
    @Query('search') search?: string,
  ) {
    return this.app.listCases(user, { tab, search });
  }

  @Get('cases/:id')
  getCase(@Param('id') id: string, @CurrentUser() user: any) {
    return this.app.getCaseDetail(user, id);
  }

  @Patch('cases/:id/preparation')
  updatePreparation(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: any,
  ) {
    return this.app.updatePreparation(user, id, body);
  }

  @Patch('cases/:id/accept')
  accept(
    @Param('id') id: string,
    @Body() body: { receivingStaffName?: string },
    @CurrentUser() user: any,
  ) {
    return this.coordination.acceptCase(id, user.sub, body.receivingStaffName);
  }

  @Patch('cases/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: { reason: HospitalRefusalReason; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.coordination.rejectCase(id, body.reason, body.notes, user.sub);
  }

  @Get('ambulances/incoming')
  incomingAmbulances(@CurrentUser() user: any) {
    return this.app.getIncomingAmbulances(user);
  }

  @Get('handover/queue')
  handoverQueue(@CurrentUser() user: any) {
    return this.app.getHandoverQueue(user);
  }

  @Patch('handover/:id/start')
  startHandover(@Param('id') id: string, @CurrentUser() user: any) {
    return this.coordination.startHandover(id, user.sub);
  }

  @Patch('handover/:id/complete')
  completeHandover(
    @Param('id') id: string,
    @Body() body: { receivingStaffName?: string; department?: string; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.coordination.completeHandover(id, user.sub, body);
  }

  @Patch('capacity')
  updateCapacity(@CurrentUser() user: any, @Body() body: Record<string, unknown>) {
    return this.app.updateCapacity(user, body as any);
  }

  @Get('reports')
  reports(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.app.getReports(user, startDate, endDate);
  }
}
