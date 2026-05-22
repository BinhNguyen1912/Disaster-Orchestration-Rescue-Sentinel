import { IsOptional, IsEnum } from 'class-validator';
import { TeamType } from '@domain/enums/teamType.enum';

export class QueryTeamSpecializationDto {
  @IsOptional()
  @IsEnum(TeamType)
  teamType?: TeamType;
}
