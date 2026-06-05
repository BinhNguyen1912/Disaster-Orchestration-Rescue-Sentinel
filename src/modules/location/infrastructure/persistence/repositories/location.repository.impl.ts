import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvinceEntity } from '@infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '@infrastructure/database/entities/administrative-unit.entity';
import {
  IProvinceRepository,
  IWardRepository,
} from '../../../domain/repositories/location.repository.interface';

@Injectable()
export class ProvinceRepositoryImpl implements IProvinceRepository {
  constructor(
    @InjectRepository(ProvinceEntity)
    private readonly repo: Repository<ProvinceEntity>,
  ) {}

  async findAll(): Promise<ProvinceEntity[]> {
    return this.repo.find({
      order: { name: 'ASC' },
    });
  }

  async findById(id: number): Promise<ProvinceEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByCode(code: number): Promise<ProvinceEntity | null> {
    return this.repo.findOne({ where: { code } });
  }
}

@Injectable()
export class WardRepositoryImpl implements IWardRepository {
  constructor(
    @InjectRepository(AdministrativeUnitEntity)
    private readonly repo: Repository<AdministrativeUnitEntity>,
  ) {}

  async findByProvinceId(
    provinceId: number,
  ): Promise<AdministrativeUnitEntity[]> {
    return this.repo.find({
      where: { provinceId },
      order: { name: 'ASC' },
    });
  }

  async findById(id: number): Promise<AdministrativeUnitEntity | null> {
    return this.repo.findOne({ where: { id } });
  }
}
