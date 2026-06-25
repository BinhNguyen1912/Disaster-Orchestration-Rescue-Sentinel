import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IRescueEquipmentRepository } from '../../domain/repositories/rescue-equipment.repository.interface';
import { RescueEquipment } from '../../domain/entities/rescue-equipment';
import { UpdateEquipmentDto } from '../dtos/update-equipment.dto';
import { CreateEquipmentDto } from '../dtos/create-equipment.dto';
import type { IRescueTeamRepository } from '../../../rescue-team/domain/repositories/rescue-team.repository.interface';

@Injectable()
export class RescueEquipmentService {
  constructor(
    @Inject('IRescueEquipmentRepository')
    private readonly equipmentRepo: IRescueEquipmentRepository,
    @Inject('IRescueTeamRepository')
    private readonly teamRepo: IRescueTeamRepository,
  ) {}

  async findByTeamId(teamId: number): Promise<RescueEquipment[]> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) {
      throw new NotFoundException(`Không tìm thấy đội cứu hộ với ID ${teamId}`);
    }

    return this.equipmentRepo.findByTeamId(teamId);
  }

  async update(
    teamId: number,
    equipmentId: number,
    dto: UpdateEquipmentDto,
  ): Promise<RescueEquipment> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) {
      throw new NotFoundException(`Không tìm thấy đội cứu hộ với ID ${teamId}`);
    }

    const equipment = await this.equipmentRepo.findById(equipmentId);
    if (!equipment || equipment.teamId !== teamId) {
      throw new NotFoundException(
        `Không tìm thấy thiết bị với ID ${equipmentId} trong đội ${teamId}`,
      );
    }

    const updated = await this.equipmentRepo.update(equipmentId, dto);
    if (!updated) {
      throw new NotFoundException(`Cập nhật thiết bị không thành công`);
    }

    return updated;
  }

  async create(
    teamId: number,
    dto: CreateEquipmentDto,
  ): Promise<RescueEquipment> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) {
      throw new NotFoundException(`Không tìm thấy đội cứu hộ với ID ${teamId}`);
    }

    return this.equipmentRepo.create({
      ...dto,
      teamId,
    });
  }

  async delete(teamId: number, equipmentId: number): Promise<void> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) {
      throw new NotFoundException(`Không tìm thấy đội cứu hộ với ID ${teamId}`);
    }

    const equipment = await this.equipmentRepo.findById(equipmentId);
    if (!equipment || equipment.teamId !== teamId) {
      throw new NotFoundException(
        `Không tìm thấy thiết bị với ID ${equipmentId} trong đội ${teamId}`,
      );
    }

    await this.equipmentRepo.delete(equipmentId);
  }
}
