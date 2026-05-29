import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // In a real application, you would validate the refresh token against the database
    // For now, we'll return the payload
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
