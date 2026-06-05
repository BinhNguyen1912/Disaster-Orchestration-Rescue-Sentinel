import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@shared/core/enums/gender.enum';

export class CreateUserValidationDto {
  @ApiProperty()
  @IsNumber()
  provinceId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  adminUnitId?: number;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  @MinLength(9)
  nationalId: string;

  @ApiProperty()
  @IsString()
  dateOfBirth: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  roleId?: number;
}
