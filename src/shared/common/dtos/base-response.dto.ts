import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T> {
  @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
  statusCode: number;
  @ApiProperty({ example: 'Thành công', description: 'Thông báo kết quả' })
  message: string;
  data: T;
}
