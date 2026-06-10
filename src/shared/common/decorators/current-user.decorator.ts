import { AccessTokenPayload } from '../../../modules/auth/domain/interfaces/jwt-payload.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  <K extends keyof AccessTokenPayload | undefined = undefined>(
    data: K,
    ctx: ExecutionContext,
  ): K extends keyof AccessTokenPayload
    ? AccessTokenPayload[K]
    : AccessTokenPayload => {
    const request = ctx.switchToHttp().getRequest();
    console.log('CurrentUser Decorator - Request User:', request.user);
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
