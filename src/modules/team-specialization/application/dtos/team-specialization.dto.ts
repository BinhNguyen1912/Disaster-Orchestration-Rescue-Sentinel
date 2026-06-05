import { TeamType } from '@shared/core/enums/teamType.enum';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreateTeamSpecializationDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(TeamType)
  teamType: TeamType;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTeamSpecializationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsEnum(TeamType)
  @IsOptional()
  teamType?: TeamType;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
