import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelSosRequestValidationDto {
  @ApiProperty({
    example: 'Gia đình đã tự di chuyển đến nơi an toàn bằng thuyền cá nhân.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Lý do hủy không được để trống' })
  reason: string;
}
