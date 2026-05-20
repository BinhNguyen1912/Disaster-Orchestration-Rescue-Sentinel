import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Admin Hà Nội' })
  fullName: string;

  @ApiProperty({ example: 'admin.hanoi@system.com', required: false })
  email?: string;

  @ApiProperty({ example: '0900000001' })
  phone: string;

  @ApiProperty({ example: 1 })
  provinceId: number;
}
