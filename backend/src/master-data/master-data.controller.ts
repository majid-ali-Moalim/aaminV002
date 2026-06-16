import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MasterDataService, MdmEntityKey } from './master-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('master-data')
@Controller('master-data')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MasterDataController {
  constructor(private readonly mdm: MasterDataService) {}

  @Get('settings/section/:section')
  @RequirePermissions('system.setup')
  @ApiOperation({ summary: 'Get system settings by section' })
  getSettingsSection(@Param('section') section: string) {
    return this.mdm.getSystemSettingsBySection(section);
  }

  @Patch('settings/section/:section')
  @RequirePermissions('system.setup')
  @ApiOperation({ summary: 'Update system settings section' })
  updateSettingsSection(
    @Param('section') section: string,
    @Body() body: { settings: { key: string; value: unknown; description?: string }[] },
    @CurrentUser() user: any,
  ) {
    return this.mdm.upsertSystemSettings(section, body.settings ?? [], user?.id);
  }

  @Get(':entity/all')
  @RequirePermissions('system.regions')
  @ApiOperation({ summary: 'List all MDM records (no pagination)' })
  listAll(@Param('entity') entity: MdmEntityKey, @Query('status') status?: 'all' | 'active' | 'inactive') {
    return this.mdm.listAll(entity, { status, includeInactive: true });
  }

  @Get(':entity/audit/logs')
  @RequirePermissions('system.setup')
  @ApiOperation({ summary: 'MDM audit logs for entity type' })
  auditLogs(@Param('entity') entity: MdmEntityKey) {
    return this.mdm.getAuditLogs(entity);
  }

  @Get(':entity/:id')
  @RequirePermissions('system.regions')
  getOne(@Param('entity') entity: MdmEntityKey, @Param('id') id: string) {
    return this.mdm.getOne(entity, id);
  }

  @Get(':entity')
  @RequirePermissions('system.regions')
  @ApiOperation({ summary: 'List MDM records with pagination' })
  list(
    @Param('entity') entity: MdmEntityKey,
    @Query('search') search?: string,
    @Query('status') status?: 'all' | 'active' | 'inactive',
    @Query('regionId') regionId?: string,
    @Query('districtId') districtId?: string,
    @Query('incidentCategoryId') incidentCategoryId?: string,
    @Query('section') section?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.mdm.list(entity, {
      search,
      status,
      regionId,
      districtId,
      incidentCategoryId,
      section,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      includeInactive: includeInactive === 'true',
    });
  }

  @Post(':entity')
  @RequirePermissions('system.setup')
  create(@Param('entity') entity: MdmEntityKey, @Body() body: any, @CurrentUser() user: any) {
    return this.mdm.create(entity, body, user?.id);
  }

  @Patch(':entity/:id/activate')
  @RequirePermissions('system.setup')
  activate(@Param('entity') entity: MdmEntityKey, @Param('id') id: string, @CurrentUser() user: any) {
    return this.mdm.setActive(entity, id, true, user?.id);
  }

  @Patch(':entity/:id/deactivate')
  @RequirePermissions('system.setup')
  deactivate(@Param('entity') entity: MdmEntityKey, @Param('id') id: string, @CurrentUser() user: any) {
    return this.mdm.setActive(entity, id, false, user?.id);
  }

  @Patch(':entity/:id')
  @RequirePermissions('system.setup')
  update(
    @Param('entity') entity: MdmEntityKey,
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.mdm.update(entity, id, body, user?.id);
  }

  @Delete(':entity/:id')
  @RequirePermissions('system.setup')
  remove(@Param('entity') entity: MdmEntityKey, @Param('id') id: string, @CurrentUser() user: any) {
    return this.mdm.remove(entity, id, user?.id);
  }
}
