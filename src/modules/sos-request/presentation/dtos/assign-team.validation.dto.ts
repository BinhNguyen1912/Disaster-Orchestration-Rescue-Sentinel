import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class AssignTeamValidationDto {
  @ApiProperty({ example: 32, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  teamId?: number;
}
