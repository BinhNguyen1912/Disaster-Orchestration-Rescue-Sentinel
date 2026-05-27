import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../application/services/auth.service';
import { APP_MESSAGES } from '@shared/common/constants/messages.constant';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'identifier',
      passwordField: 'password',
    });
  }

  async validate(identifier: string, pass: string): Promise<any> {
    const user = await this.authService.validateUser(identifier, pass);
    if (!user) {
      throw new UnauthorizedException(APP_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    return user;
  }
}
