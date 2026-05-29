import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class DispatcherAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
      request.user = payload;

      if (payload.role !== 'EMPLOYEE') {
        throw new ForbiddenException('Access restricted to dispatchers only');
      }

      const roleName = String(payload.employeeRole || '').toUpperCase();
      if (!roleName.includes('DISPATCH')) {
        throw new ForbiddenException('Dispatcher credentials required');
      }

      if (payload.employeeStatus && payload.employeeStatus !== 'ACTIVE') {
        throw new ForbiddenException('Dispatcher account is inactive');
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
