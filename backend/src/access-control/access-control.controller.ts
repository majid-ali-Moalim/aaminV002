import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
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
}
