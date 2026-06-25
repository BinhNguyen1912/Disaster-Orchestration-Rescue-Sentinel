import { EquipmentStatus } from '@shared/index';

export interface CreateEquipmentDto {
  name: string;
  quantity?: number;
  status?: EquipmentStatus;
  description?: string;
}
