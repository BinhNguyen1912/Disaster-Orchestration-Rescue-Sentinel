export interface Permission {
  id: number;
  name: string;
  module: string;
  description?: string;
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: number;
  updatedBy?: number;
}
