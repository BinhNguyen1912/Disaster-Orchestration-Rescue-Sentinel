import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'ID độc nhất của thiết bị' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({ description: 'FCM Token nhận thông báo đẩy' })
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @ApiPropertyOptional({ description: 'Hệ điều hành (iOS, Android,...)' })
  @IsString()
  @IsOptional()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Tên model thiết bị' })
  @IsString()
  @IsOptional()
  deviceModel?: string;

  @ApiPropertyOptional({ description: 'Phiên bản hệ điều hành' })
  @IsString()
  @IsOptional()
  osVersion?: string;
}
