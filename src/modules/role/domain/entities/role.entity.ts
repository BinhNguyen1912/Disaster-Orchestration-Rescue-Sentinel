export interface Role {
  id: number;
  name: string;
  description?: string;
  level: number;
  isSystem: boolean;
  isActive: boolean;
  provinceId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
