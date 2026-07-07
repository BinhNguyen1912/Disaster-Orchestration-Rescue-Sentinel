import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { DispatchMethod } from '@shared/core/enums/dispatchMethod.enum';

export class DispatchFloodRequestValidationDto {
  @ApiProperty({ enum: DispatchMethod, example: DispatchMethod.AUTO })
  @IsEnum(DispatchMethod, { message: 'Phương thức điều phối không hợp lệ' })
  @IsNotEmpty()
  method: DispatchMethod;

  @ApiProperty({ example: 5, required: false })
  @ValidateIf((o) => o.method === DispatchMethod.MANUAL)
  @IsInt({ message: 'ID Đội cứu hộ phải là số nguyên' })
  @Min(1)
  @IsNotEmpty({ message: 'ID Đội cứu hộ là bắt buộc khi chọn điều phối thủ công' })
  teamId?: number;

  @ApiProperty({ example: 'Đã giao đội phản ứng nhanh cứu hộ các hộ gia đình bị mắc kẹt', required: false })
  @IsString()
  @IsOptional()
  reviewNotes?: string;
}
