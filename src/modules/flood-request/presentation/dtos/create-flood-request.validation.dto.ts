import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsArray,
  Matches,
} from 'class-validator';
import { Severity } from '@shared/core/enums/level.enum';
import { FloodRequestPurpose } from '@shared/core/enums/floodRequestPurpose.enum';

export class CreateFloodRequestValidationDto {
  @ApiProperty({ example: 'Ngập lụt tại khu phố 3' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Nước ngập sâu ngang hông, xe máy không đi lại được', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  requesterName: string;

  @ApiProperty({ example: '0917234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[3|5|7|8|9])+([0-9]{8})$/, {
    message: 'Số điện thoại không hợp lệ (phải là số điện thoại Việt Nam)',
  })
  requesterPhone: string;

  @ApiProperty({ example: 10.7589 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 106.7004 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({ example: 'Trước cổng trường Tiểu học A', required: false })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiProperty({ example: 'Số 12 đường số 4', required: false })
  @IsString()
  @IsOptional()
  addressDetail?: string;

  @ApiProperty({ enum: Severity, example: Severity.HIGH })
  @IsEnum(Severity, { message: 'Mức độ nghiêm trọng không hợp lệ' })
  @IsNotEmpty()
  severity: Severity;

  @ApiProperty({ example: 30, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  floodDepthCmMin?: number;

  @ApiProperty({ example: 60, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  floodDepthCmMax?: number;

  @ApiProperty({ example: 0.5, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedAreaHa?: number;

  @ApiProperty({ example: 'Đường bê tông', required: false })
  @IsString()
  @IsOptional()
  roadType?: string;

  @ApiProperty({ example: 'Cản trở giao thông hoàn toàn', required: false })
  @IsString()
  @IsOptional()
  impact?: string;

  @ApiProperty({ example: 'Mưa vừa', required: false })
  @IsString()
  @IsOptional()
  weather?: string;

  @ApiProperty({ example: 'Cần cứu trợ thực phẩm gấp', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: ['https://storage.rescue.gov.vn/flood/img.jpg'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiProperty({ enum: FloodRequestPurpose, example: FloodRequestPurpose.DECLARE_ONLY })
  @IsEnum(FloodRequestPurpose, { message: 'Mục đích yêu cầu không hợp lệ' })
  @IsNotEmpty()
  purpose: FloodRequestPurpose;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  provinceId?: number;

  @ApiProperty({ example: 12, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  adminUnitId?: number;

  @ApiProperty({ example: 'Chrome/iOS', required: false })
  @IsString()
  @IsOptional()
  deviceInfo?: string;
}
