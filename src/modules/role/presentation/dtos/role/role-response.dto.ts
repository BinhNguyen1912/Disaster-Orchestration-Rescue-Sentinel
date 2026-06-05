import { RoleEntity } from '@infrastructure/database/entities/role.entity';

export class RoleResponseDto {
  id: number;
  name: string;
  description?: string;
  level: number;
  isSystem: boolean;
  isActive: boolean;
  provinceId?: number;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: RoleEntity): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.level = entity.level;
    dto.isSystem = entity.isSystem;
    dto.isActive = entity.isActive;
    dto.provinceId = entity.provinceId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
