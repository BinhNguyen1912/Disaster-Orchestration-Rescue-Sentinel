import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'nguyenvana@gmail.com',
    description: 'Email hoặc số điện thoại đã đăng ký',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tài khoản không được để trống' })
  identifier: string;
}
