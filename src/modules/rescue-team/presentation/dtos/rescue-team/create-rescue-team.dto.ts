import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
} from 'class-validator';
import { TeamType } from '@shared/core/enums/teamType.enum';

export class CreateRescueTeamValidationDto {
  @IsInt()
  @IsNotEmpty()
  provinceId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(TeamType)
  teamType?: TeamType;

  @IsInt()
  @IsNotEmpty()
  adminUnitId: number;

  @IsOptional()
  baseLocation?: { type: 'Point'; coordinates: [number, number] };

  @IsOptional()
  coverageArea?: { type: 'Polygon'; coordinates: number[][][] };

  @IsOptional()
  @IsNumber()
  maxCapacity?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  specializationIds?: number[];

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
