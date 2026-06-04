import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ALL_PERMISSION_KEYS } from '../../access-control/permission-catalog';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('User not authenticated');

    if (user.role === 'ADMIN') return true;

    const granted: string[] = user.permissions ?? [];
    const hasAll = required.every((p) => granted.includes(p));
    if (!hasAll) {
      throw new ForbiddenException(`Missing required permission(s): ${required.join(', ')}`);
    }
    return true;
  }
}

export { ALL_PERMISSION_KEYS };
