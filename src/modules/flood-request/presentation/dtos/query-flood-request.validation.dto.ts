import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FloodRequestStatus } from '@shared/core/enums/floodRequestStatus.enum';
import { FloodRequestPurpose } from '@shared/core/enums/floodRequestPurpose.enum';

export class QueryFloodRequestValidationDto {
  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 20, required: false })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  provinceId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  requesterId?: number;

  @ApiProperty({ enum: FloodRequestStatus, required: false })
  @IsEnum(FloodRequestStatus)
  @IsOptional()
  status?: FloodRequestStatus;

  @ApiProperty({ enum: FloodRequestPurpose, required: false })
  @IsEnum(FloodRequestPurpose)
  @IsOptional()
  purpose?: FloodRequestPurpose;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isApprovedForMap?: boolean;
}
