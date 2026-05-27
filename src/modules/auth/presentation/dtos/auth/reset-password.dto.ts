import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'uuid-reset-token-from-forgot-password-response' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token không được để trống' })
  resetToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải gồm đúng 6 chữ số' })
  otp: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  newPassword: string;
}
