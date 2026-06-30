import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from '../../../application/services/auth.service';
import { APP_MESSAGES } from '@shared/common/constants/messages.constant';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'identifier',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: any, identifier: string, pass: string): Promise<any> {
    const provinceId = req.body.provinceId
      ? Number(req.body.provinceId)
      : undefined;
    if (provinceId === undefined || isNaN(provinceId)) {
      throw new BadRequestException(
        'ID tỉnh/thành phố (provinceId) là bắt buộc và phải là số nguyên.',
      );
    }
    const user = await this.authService.validateUser(
      identifier,
      pass,
      provinceId,
    );
    if (!user) {
      throw new UnauthorizedException(APP_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    return user;
  }
}
