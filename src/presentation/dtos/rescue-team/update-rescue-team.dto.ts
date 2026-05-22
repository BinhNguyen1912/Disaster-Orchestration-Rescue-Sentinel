import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  IsInt,
} from 'class-validator';
import { TeamStatus } from '@domain/enums/teamStatus.enum';

export class UpdateRescueTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @IsOptional()
  currentLocation?: { type: 'Point'; coordinates: [number, number] };

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
