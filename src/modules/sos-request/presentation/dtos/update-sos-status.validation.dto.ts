import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';

export class UpdateSosStatusValidationDto {
  @ApiProperty({ enum: SosStatus, example: SosStatus.ON_SITE })
  @IsEnum(SosStatus, { message: 'Trạng thái không hợp lệ' })
  @IsNotEmpty()
  status: SosStatus;

  @ApiProperty({
    example: 'Đội cứu hộ tiếp cận hiện trường lúc 14:45',
    required: false,
  })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}
