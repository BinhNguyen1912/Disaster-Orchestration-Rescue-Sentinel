import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessTokenPayload, RequestUser } from '../../../domain/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        process.env.JWT_SECRET ||
        'rescue-system-jwt-secret-key-2026',
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    return {
      userId: payload.sub,
      sub: payload.sub,
      provinceId: payload.provinceId,
      roleId: payload.roleId,
      email: payload.email,
      fullName: payload.fullName,
      phone: payload.phone,
    };
  }
}
