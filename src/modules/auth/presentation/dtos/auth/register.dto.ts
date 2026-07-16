import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  MinLength,
  Matches,
  IsBoolean,
} from 'class-validator';
import { Gender } from '@shared/core/enums/gender.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @Matches(/^(0[3|5|7|8|9])+([0-9]{8})$/, {
    message: 'Số điện thoại không hợp lệ ',
  })
  phone: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com', required: false })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  password: string;

  @ApiProperty({ example: '012345678901' })
  @IsString()
  nationalId: string;

  @ApiProperty({ example: '2000-01-01T00:00:00.000Z' })
  @IsDateString({}, { message: 'Ngày sinh không đúng định dạng ISO8601' })
  dateOfBirth: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender, { message: 'Giới tính phải là MALE, FEMALE hoặc OTHER' })
  gender: Gender;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  provinceId: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  adminUnitId?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isVolunteer?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  needsHelp?: boolean;
}
