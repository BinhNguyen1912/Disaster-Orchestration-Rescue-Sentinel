import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IRescueEquipmentRepository } from '../../../domain/repositories/rescue-equipment.repository.interface';
import { RescueEquipmentEntity } from '@infrastructure/database/entities/rescue-equipment.entity';
import { RescueEquipment } from '../../../domain/entities/rescue-equipment';

@Injectable()
export class RescueEquipmentRepositoryImpl implements IRescueEquipmentRepository {
  constructor(
    @InjectRepository(RescueEquipmentEntity)
    private readonly repo: Repository<RescueEquipmentEntity>,
  ) {}

  async findById(id: number): Promise<RescueEquipment | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByTeamId(teamId: number): Promise<RescueEquipment[]> {
    return this.repo.find({
      where: { teamId },
      order: { id: 'ASC' },
    });
  }

  async create(data: Partial<RescueEquipment>): Promise<RescueEquipment> {
    const entity = this.repo.create(data as any);
    return this.repo.save(entity) as any;
  }

  async update(
    id: number,
    data: Partial<RescueEquipment>,
  ): Promise<RescueEquipment | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    Object.assign(existing, data);
    return this.repo.save(existing);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repo.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}
