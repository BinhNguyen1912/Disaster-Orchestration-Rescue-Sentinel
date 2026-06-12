import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { Severity } from '@shared/core/enums/level.enum';

export class QuerySosRequestValidationDto {
  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, example: 20 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  provinceId?: number;

  @ApiProperty({ enum: SosStatus, required: false, example: SosStatus.PENDING })
  @IsOptional()
  @IsEnum(SosStatus)
  status?: SosStatus;

  @ApiProperty({
    enum: SosRequestType,
    required: false,
    example: SosRequestType.FLOOD,
  })
  @IsOptional()
  @IsEnum(SosRequestType)
  requestType?: SosRequestType;

  @ApiProperty({ enum: Severity, required: false, example: Severity.HIGH })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @ApiProperty({ required: false, example: 32 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  assignedTeamId?: number;
}
