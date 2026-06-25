import { EquipmentStatus } from '@shared/index';

export interface UpdateEquipmentDto {
  name?: string;
  quantity?: number;
  status?: EquipmentStatus;
  description?: string;
}
