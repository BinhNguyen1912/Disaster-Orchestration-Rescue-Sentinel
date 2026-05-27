import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AccessService } from '../../../application/services/access.service';
import { Observable } from 'rxjs';

@Injectable()
export class AccessGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: AccessService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.headers['api-key'];
    if (apiKey) {
      const isValid = this.accessService.validateApiKey(apiKey);
      if (isValid) {
        return true;
      }
    }

    return super.canActivate(context);
  }
}
