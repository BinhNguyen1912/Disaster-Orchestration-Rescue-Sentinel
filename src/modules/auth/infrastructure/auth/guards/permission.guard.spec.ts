import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { IPermissionRepository } from '../../../domain/repositories/permission.repository.interface';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;
  let permissionRepository: Partial<IPermissionRepository>;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockPermissionRepository = {
    findPermissionNamesByRoleId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionGuard,
        { provide: Reflector, useValue: mockReflector },
        {
          provide: 'IPermissionRepository',
          useValue: mockPermissionRepository,
        },
      ],
    }).compile();

    guard = module.get<PermissionGuard>(PermissionGuard);
    reflector = module.get<Reflector>(Reflector);
    permissionRepository = module.get('IPermissionRepository');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access when no permissions are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockExecutionContext({ roleId: 1 });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has required permissions', async () => {
      const requiredPermissions = ['rescue:read', 'rescue:create'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);
      mockPermissionRepository.findPermissionNamesByRoleId.mockResolvedValue([
        'rescue:read',
        'rescue:create',
        'user:read',
      ]);

      const context = createMockExecutionContext({ roleId: 1 });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        mockPermissionRepository.findPermissionNamesByRoleId,
      ).toHaveBeenCalledWith(1);
    });

    it('should deny access when user lacks required permissions', async () => {
      const requiredPermissions = ['rescue:read', 'rescue:create'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);
      mockPermissionRepository.findPermissionNamesByRoleId.mockResolvedValue([
        'rescue:read',
      ]);

      const context = createMockExecutionContext({ roleId: 1 });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow when user has no roleId', async () => {
      const requiredPermissions = ['rescue:read'];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);

      const context = createMockExecutionContext({});
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(
        mockPermissionRepository.findPermissionNamesByRoleId,
      ).not.toHaveBeenCalled();
    });

    it('should check all required permissions are present', async () => {
      const requiredPermissions = [
        'rescue:read',
        'rescue:create',
        'rescue:update',
      ];
      mockReflector.getAllAndOverride.mockReturnValue(requiredPermissions);
      mockPermissionRepository.findPermissionNamesByRoleId.mockResolvedValue([
        'rescue:read',
        'rescue:create',
      ]);

      const context = createMockExecutionContext({ roleId: 1 });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
