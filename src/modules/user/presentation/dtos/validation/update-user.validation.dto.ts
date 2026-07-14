import { IsString, IsOptional, IsInt, IsObject, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  homeLocation?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVolunteer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  needsHelp?: boolean;
}

