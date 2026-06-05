export interface CreateRoleDto {
  name: string;
  description?: string;
  level: number;
  isSystem?: boolean;
  isActive?: boolean;
  provinceId?: number;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  level?: number;
  isActive?: boolean;
  provinceId?: number;
}

export interface QueryRoleDto {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}
