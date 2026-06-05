import type { Role } from '../entities/role.entity';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface IRoleRepository {
  findById(id: number): Promise<Role | null>;
  findAll(
    filters?: { isActive?: boolean; search?: string },
    pagination?: PaginationOptions,
  ): Promise<{ items: Role[]; total: number }>;
  create(data: Partial<Role>): Promise<Role>;
  update(id: number, data: Partial<Role>): Promise<Role | null>;
  delete(id: number): Promise<boolean>;
}
