import { EquipmentStatus } from '@shared/index';

export interface RescueEquipment {
  id: number;
  teamId: number;
  name: string;
  quantity: number;
  status: EquipmentStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
