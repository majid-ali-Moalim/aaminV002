import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class HospitalAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
      request.user = payload;

      if (payload.role !== 'EMPLOYEE') {
        throw new ForbiddenException('Access restricted to hospital staff');
      }

      const roleName = String(payload.employeeRole ?? '').toUpperCase();
      const isHospitalRole =
        roleName.includes('HOSPITAL') ||
        roleName.includes('COORD') && roleName.includes('HOSPITAL');

      if (!payload.hospitalId && !isHospitalRole) {
        throw new ForbiddenException('Hospital portal access requires a linked hospital profile');
      }

      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
