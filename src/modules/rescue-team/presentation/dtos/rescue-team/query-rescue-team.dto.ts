import { IsOptional, IsInt, IsEnum, IsString } from 'class-validator';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';
import { TeamType } from '@shared/core/enums/teamType.enum';

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
  availableOnly?: boolean;
}
