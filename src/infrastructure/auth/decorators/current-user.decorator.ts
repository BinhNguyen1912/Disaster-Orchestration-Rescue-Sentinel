import { JwtPayload } from '@domain/interfaces/jwt-payload.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  <K extends keyof JwtPayload | undefined = undefined>(
    data: K,
    ctx: ExecutionContext,
  ): K extends keyof JwtPayload ? JwtPayload[K] : JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
