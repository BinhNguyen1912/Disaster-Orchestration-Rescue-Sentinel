import { RescueEquipment } from '../entities/rescue-equipment';

export interface IRescueEquipmentRepository {
  findById(id: number): Promise<RescueEquipment | null>;
  findByTeamId(teamId: number): Promise<RescueEquipment[]>;
  create(data: Partial<RescueEquipment>): Promise<RescueEquipment>;
  update(
    id: number,
    data: Partial<RescueEquipment>,
  ): Promise<RescueEquipment | null>;
  delete(id: number): Promise<boolean>;
}
