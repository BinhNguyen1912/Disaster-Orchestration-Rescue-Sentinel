import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SystemRoleId } from '@shared/common/constants/permissions.constant';

@Injectable()
export class ProvinceScopeGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true;
    }

    if (user.roleId === SystemRoleId.SYSTEM_ADMIN) {
      return true;
    }

    if (user.provinceId) {
      request['provinceScope'] = { provinceId: user.provinceId };
    } else {
      console.log('ProvinceScopeGuard: No provinceId on user', user);
    }

    return true;
  }
}
