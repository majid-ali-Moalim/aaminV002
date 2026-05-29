import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      email: payload.email,
      isActive: payload.isActive !== false,
      employeeType: payload.employeeType,
      employeeRole: payload.employeeRole ?? null,
      employeeStatus: payload.employeeStatus ?? null,
      employeeId: payload.employeeId ?? null,
    };
  }
}
