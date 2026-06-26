import { Body, Controller, Delete, Get, Param, Patch, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessControlService } from './access-control.service';

@ApiTags('access-control')
@Controller('access-control')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('catalog')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Permission catalog metadata' })
  getCatalog() {
    return this.accessControlService.getCatalog();
  }

  @Get('me/permissions')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER', 'NURSE', 'EMPLOYEE', 'HOSPITAL')
  @ApiOperation({ summary: 'Get current user granted permissions' })
  getMyPermissions(@Req() req: { user: { id: string; sub?: string; role: string; employeeRole?: string } }) {
    const userId = req.user.id ?? req.user.sub!;
    return this.accessControlService.getUserPermissions(userId);
  }

  @Get('users/:userId/permissions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get user granted and suggested permissions' })
  getUserPermissions(@Param('userId') userId: string) {
    return this.accessControlService.getUserPermissions(userId);
  }

  @Put('users/:userId/permissions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Grant permissions to a staff user' })
  setUserPermissions(
    @Param('userId') userId: string,
    @Body()
    body: {
      permissions: Array<{ permissionKey: string; expiresAt?: string | null }> | string[];
      expiresAt?: string | null;
    },
    @Req() req: { user: { id: string; sub?: string } },
  ) {
    const grantedById = req.user.id ?? req.user.sub!;
    const raw = body.permissions ?? [];

    const grants = raw.map((item) => {
      if (typeof item === 'string') {
        return { permissionKey: item, expiresAt: body.expiresAt ?? null };
      }
      return {
        permissionKey: item.permissionKey,
        expiresAt: item.expiresAt !== undefined ? item.expiresAt : body.expiresAt ?? null,
      };
    });

    return this.accessControlService.setUserPermissions(
      userId,
      grants,
      grantedById,
      body.expiresAt ?? null,
    );
  }

  @Get('grants')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all granted user permissions' })
  listAllGrants(
    @Query('search') search?: string,
    @Query('duration') duration?: 'all' | 'permanent' | 'temporary',
    @Query('status') status?: 'all' | 'active' | 'inactive' | 'expired',
  ) {
    return this.accessControlService.listAllGrants({ search, duration, status });
  }

  @Patch('grants/:grantId/activate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activate a granted permission' })
  activateGrant(
    @Param('grantId') grantId: string,
    @Req() req: { user: { id: string; sub?: string } },
  ) {
    const actorId = req.user.id ?? req.user.sub!;
    return this.accessControlService.setGrantActive(grantId, true, actorId);
  }

  @Patch('grants/:grantId/deactivate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate a granted permission' })
  deactivateGrant(
    @Param('grantId') grantId: string,
    @Req() req: { user: { id: string; sub?: string } },
  ) {
    const actorId = req.user.id ?? req.user.sub!;
    return this.accessControlService.setGrantActive(grantId, false, actorId);
  }

  @Delete('grants/:grantId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a granted permission' })
  deleteGrant(
    @Param('grantId') grantId: string,
    @Req() req: { user: { id: string; sub?: string } },
  ) {
    const actorId = req.user.id ?? req.user.sub!;
    return this.accessControlService.deleteGrant(grantId, actorId);
  }
}
