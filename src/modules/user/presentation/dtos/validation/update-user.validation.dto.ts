import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserValidationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalIdFrontUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalIdBackUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressDetail?: string;
}
