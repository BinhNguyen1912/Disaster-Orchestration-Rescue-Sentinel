import { Role } from 'modules/role/domain/entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dtos/role.dto';

export interface IRoleService {
  create(dto: CreateRoleDto): Promise<Role>;
  findAll(
    filters: { isActive?: boolean; search?: string },
    pagination: { page: number; limit: number },
  ): Promise<{ items: Role[]; total: number }>;
  findById(id: number): Promise<Role>;
  update(id: number, dto: UpdateRoleDto): Promise<Role>;
  delete(id: number): Promise<void>;
}
