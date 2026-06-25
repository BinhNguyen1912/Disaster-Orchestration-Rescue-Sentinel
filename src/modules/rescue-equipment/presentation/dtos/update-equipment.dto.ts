import { IsOptional, IsString, IsInt, IsEnum, Min } from 'class-validator';
import { EquipmentStatus } from '@shared/index';

export class UpdateEquipmentValidationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsEnum(EquipmentStatus)
  status?: EquipmentStatus;

  @IsOptional()
  @IsString()
  description?: string;
}
