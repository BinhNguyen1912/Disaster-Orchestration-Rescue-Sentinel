import { ProvinceEntity } from '@infrastructure/database/entities/province.entity';
import { AdministrativeUnitEntity } from '@infrastructure/database/entities/administrative-unit.entity';

export interface IProvinceRepository {
  findAll(): Promise<ProvinceEntity[]>;
  findById(id: number): Promise<ProvinceEntity | null>;
  findByCode(code: number): Promise<ProvinceEntity | null>;
}

export interface IWardRepository {
  findByProvinceId(provinceId: number): Promise<AdministrativeUnitEntity[]>;
  findById(id: number): Promise<AdministrativeUnitEntity | null>;
}