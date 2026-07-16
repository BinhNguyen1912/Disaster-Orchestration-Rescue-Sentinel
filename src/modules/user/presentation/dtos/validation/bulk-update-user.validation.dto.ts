import { IsArray, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkUpdateUserValidationDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
