import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ANY_PERMISSIONS_KEY } from '../decorators/any-permissions.decorator';
import { ALL_PERMISSION_KEYS } from '../../access-control/permission-catalog';
import { AccessControlService } from '../../access-control/access-control.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const anyRequired = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!anyRequired?.length && !required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('User not authenticated');

    if (user.role === 'ADMIN') return true;

    const userId = user.sub ?? user.id;
    const granted = await this.accessControl.getPermissionsForAuth(
      userId,
      user.role,
      user.employeeRole,
    );

    if (anyRequired?.length) {
      const hasAny = anyRequired.some((p) => granted.includes(p));
      if (!hasAny) {
        throw new ForbiddenException(
          `Missing required permission — need one of: ${anyRequired.join(', ')}`,
        );
      }
      return true;
    }

    const hasAll = required.every((p) => granted.includes(p));
    if (!hasAll) {
      throw new ForbiddenException(`Missing required permission(s): ${required.join(', ')}`);
    }
    return true;
  }
}

export { ALL_PERMISSION_KEYS };
