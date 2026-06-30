import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // Check if user exists and is authenticated
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    
    // Check if user is active (undefined/missing defaults to active)
    if (user.isActive === false) {
      throw new ForbiddenException('User account is not active');
    }
    
    // Check if user has required role (supports EMPLOYEE + employeeRole mapping)
    const hasRole = requiredRoles.some((role) => this.userHasRole(user, role));
    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    if (user.role === 'EMPLOYEE' && user.employeeStatus && user.employeeStatus !== 'ACTIVE') {
      throw new ForbiddenException('Employee account is not active');
    }
    
    return true;
  }

  private userHasRole(user: { role?: string; employeeRole?: string | null }, required: string): boolean {
    const want = required.toUpperCase()
    if (user.role?.toUpperCase() === want) return true
    if (want === 'EMPLOYEE' && user.role === 'EMPLOYEE') return true

    if (user.role !== 'EMPLOYEE' || !user.employeeRole) return false

    const name = String(user.employeeRole).toUpperCase()

    if (want === 'DISPATCHER') return name.includes('DISPATCH')
    if (want === 'DRIVER') return name.includes('DRIVER')
    if (want === 'NURSE') return name.includes('NURSE') || name.includes('PARAMEDIC')
    if (want === 'HOSPITAL') return name.includes('HOSPITAL')
    return name === want
  }
}
