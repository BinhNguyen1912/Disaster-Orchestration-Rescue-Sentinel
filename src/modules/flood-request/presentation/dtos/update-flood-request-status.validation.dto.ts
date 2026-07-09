import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsOptional,
} from 'class-validator';
import { FloodRequestStatus } from '@shared/core/enums/floodRequestStatus.enum';

export class UpdateFloodRequestStatusValidationDto {
  @ApiProperty({ enum: [FloodRequestStatus.VERIFYING, FloodRequestStatus.REJECTED], example: FloodRequestStatus.VERIFYING })
  @IsEnum([FloodRequestStatus.VERIFYING, FloodRequestStatus.REJECTED], {
    message: 'Trạng thái cập nhật chỉ có thể là VERIFYING hoặc REJECTED',
  })
  @IsNotEmpty()
  status: FloodRequestStatus;

  @ApiProperty({ example: 'Đã xác minh thực địa và xác nhận đúng thông tin', required: false })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
