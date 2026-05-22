import { IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { TeamStatus } from '@domain/enums/teamStatus.enum';

export class UpdateRescueTeamLocationDto {
  @IsNotEmpty()
  currentLocation: { type: 'Point'; coordinates: [number, number] };

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;
}
