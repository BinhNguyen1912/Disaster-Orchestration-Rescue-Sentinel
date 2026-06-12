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
import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { Severity } from '@shared/core/enums/level.enum';

export class CreateSosRequestValidationDto {
  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsString()
  @IsOptional()
  requesterName?: string;

  @ApiProperty({ example: '0917234567', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^(0[3|5|7|8|9])+([0-9]{8})$/, {
    message: 'Số điện thoại không hợp lệ (phải là số điện thoại Việt Nam)',
  })
  requesterPhone?: string;

  @ApiProperty({ enum: SosRequestType, example: SosRequestType.FLOOD })
  @IsEnum(SosRequestType, { message: 'Loại cứu hộ không hợp lệ' })
  @IsNotEmpty()
  requestType: SosRequestType;

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

  @ApiProperty({ example: 'Nước dâng cao ngập tầng trệt', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: Severity, example: Severity.HIGH })
  @IsEnum(Severity, { message: 'Mức độ nghiêm trọng không hợp lệ' })
  @IsNotEmpty()
  severity: Severity;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  provinceId: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  adminUnitId: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  trappedPeopleCount: number;

  @ApiProperty({ example: ['ELDERLY'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialNeedsTags?: string[];

  @ApiProperty({ example: ['https://storage.rescue.gov.vn/sos/img.jpg'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  imageUrls: string[];
}
