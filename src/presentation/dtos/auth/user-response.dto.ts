import { ApiProperty } from '@nestjs/swagger';
import { User } from '@domain/entities/user';

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

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.fullName = user.fullName;
    dto.email = user.email;
    dto.phone = user.phone;
    dto.provinceId = user.provinceId;
    return dto;
  }
}
