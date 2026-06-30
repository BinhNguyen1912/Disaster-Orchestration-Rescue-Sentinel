import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsInt,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@system.com',
    description: 'Email hoặc số điện thoại',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    example: 'Admin@123',
    description: 'Mật khẩu đăng nhập',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 1,
    description: 'ID tỉnh/thành phố',
  })
  @IsInt()
  @IsNotEmpty({ message: 'Vui lòng chọn Tỉnh / Thành Phố.' })
  provinceId: number;
}
