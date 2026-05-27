import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { Gender } from '@shared/core/enums/gender.enum';

export class AdminRegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn B', description: 'Họ tên đầy đủ' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0987654321', description: 'Số điện thoại' })
  @IsString()
  @Matches(/^(0[3|5|7|8|9])+([0-9]{8})$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'admin@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '012345678901', description: 'Số CCCD' })
  @IsString()
  nationalId: string;

  @ApiProperty({ example: '2000-01-01T00:00:00.000Z' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 1, description: 'ID tỉnh/thành phố' })
  @IsInt()
  @Min(1)
  provinceId: number;

  @ApiProperty({
    example: 2,
    description: 'ID vai trò (2=Admin tỉnh, 3=Quản lý cứu hộ, 4=Cứu hộ viên)',
  })
  @IsInt()
  @Min(1)
  roleId: number;
}
