import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
} from 'class-validator';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';

export class UpdateRescueTeamValidationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TeamType)
  teamType?: TeamType;

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @IsOptional()
  @IsNumber()
  activeCasesCount?: number;

  @IsOptional()
  @IsNumber()
  maxCapacity?: number;

  @IsOptional()
  @IsArray()
  coverageArea?: { type: 'Polygon'; coordinates: number[][][] };

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsNumber()
  provinceId?: number;

  @IsOptional()
  @IsNumber()
  adminUnitId?: number;

  @IsOptional()
  baseLocation?: { type: 'Point'; coordinates: [number, number] };

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  foundingDate?: string;

  @IsOptional()
  @IsString()
  baseLocationAddress?: string;

  @IsOptional()
  @IsNumber()
  coverageAreaSize?: number;
}
