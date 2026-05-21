import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { IPermissionRepository } from '@domain/repositories/permission.repository.interface';
import { Inject } from '@nestjs/common';

/**
 * PermissionGuard — Kiểm tra user có quyền cụ thể không (RBAC).
 *
 * === CÁCH HOẠT ĐỘNG ===
 *
 * 1. Đọc metadata `permissions` từ handler/class thông qua Reflector
 *    (Reflector là công cụ metaprogramming của NestJS — đọc metadata
 *     mà decorator @RequirePermissions() đã gán lên method/class)
 *
 * 2. Nếu KHÔNG có metadata → cho phép qua (endpoint không yêu cầu permission cụ thể)
 *    Endpoint vẫn được bảo vệ bởi AccessGuard (phải đăng nhập),
 *    nhưng không cần check permission chi tiết.
 *
 * 3. Nếu CÓ metadata → lấy roleId từ request.user (do JwtStrategy inject)
 *    → query DB lấy danh sách permission của role đó
 *    → so sánh: TẤT CẢ required permissions phải có trong user permissions
 *
 * 4. Nếu thiếu bất kỳ permission nào → throw 403 Forbidden
 *
 * === VỊ TRÍ TRONG GUARD PIPELINE ===
 *
 * Request → AccessGuard (WHO?) → PermissionGuard (CAN?) → Controller
 *
 * === EDGE CASES ===
 *
 * - API Key request: request.user không có roleId → cho phép qua
 *   (API Key là cơ chế high-trust, system-to-system)
 *
 * - roleId undefined/missing: cho phép qua
 *   (endpoint có thể không yêu cầu permission cụ thể)
 *
 * === TỪ KHÓA NÂNG CAO ===
 *
 * - NestJS Reflector + SetMetadata: metaprogramming pattern
 * - Guard Pipeline: nhiều Guard chạy tuần tự, mỗi Guard kiểm tra 1 aspect
 * - RBAC (Role-Based Access Control): phân quyền dựa trên vai trò
 * - Subset check: requiredPermissions ⊆ userPermissions
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('IPermissionRepository')
    private readonly permissionRepository: IPermissionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Đọc metadata permissions từ @RequirePermissions() decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Không có metadata → endpoint không yêu cầu permission cụ thể → cho qua
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 3. API Key request hoặc không có roleId → cho qua (high-trust)
    if (!user?.roleId) {
      return true;
    }

    // 4. Query DB lấy danh sách permission của role
    const userPermissions =
      await this.permissionRepository.findPermissionNamesByRoleId(user.roleId);

    // 5. Check: TẤT CẢ required permissions phải có trong user permissions
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter(
        (perm) => !userPermissions.includes(perm),
      );
      throw new ForbiddenException(
        `Missing required permissions: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
