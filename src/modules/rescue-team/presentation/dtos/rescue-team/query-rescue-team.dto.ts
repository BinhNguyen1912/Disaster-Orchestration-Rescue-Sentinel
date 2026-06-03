import {
  IsOptional,
  IsInt,
  IsEnum,
  IsString,
  IsBoolean,
} from 'class-validator';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { Type } from 'class-transformer';

export class QueryRescueTeamDto {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsInt()
  provinceId?: number;

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @IsOptional()
  @IsEnum(TeamType)
  teamType?: TeamType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  availableOnly?: boolean;
}

export class QueryRescueTeamValidationDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  provinceId?: number;

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  @IsOptional()
  @IsEnum(TeamType)
  teamType?: TeamType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  availableOnly?: boolean;
}
