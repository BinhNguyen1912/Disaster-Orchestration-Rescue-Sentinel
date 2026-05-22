import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
} from 'class-validator';
import { TeamType } from '@domain/enums/teamType.enum';
import { TeamStatus } from '@domain/enums/teamStatus.enum';

export class CreateRescueTeamDto {
  @IsInt()
  @IsNotEmpty()
  provinceId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TeamType)
  @IsNotEmpty()
  teamType: TeamType;

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
  equipment?: Record<string, any>;
}
