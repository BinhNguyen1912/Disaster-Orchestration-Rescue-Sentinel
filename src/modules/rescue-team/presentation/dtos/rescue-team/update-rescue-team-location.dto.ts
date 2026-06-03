import { IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';

export class UpdateRescueTeamLocationValidationDto {
  @IsNotEmpty()
  currentLocation: { type: 'Point'; coordinates: [number, number] };

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;
}
