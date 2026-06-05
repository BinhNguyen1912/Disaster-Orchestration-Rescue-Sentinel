import { IsEnum, IsOptional } from 'class-validator';
import { TeamType } from '@shared/core/enums/teamType.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class QueryTeamSpecializationDto {
  @ApiPropertyOptional({ enum: TeamType })
  @IsEnum(TeamType)
  @IsOptional()
  teamType?: TeamType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
