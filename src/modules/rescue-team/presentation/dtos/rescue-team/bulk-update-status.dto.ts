import { IsArray, IsEnum, ArrayNotEmpty } from 'class-validator';
import { TeamStatus } from '@shared/core/enums/teamStatus.enum';

export class BulkUpdateStatusValidationDto {
  @IsArray()
  @ArrayNotEmpty()
  ids: number[];

  @IsEnum(TeamStatus)
  status: TeamStatus;
}
