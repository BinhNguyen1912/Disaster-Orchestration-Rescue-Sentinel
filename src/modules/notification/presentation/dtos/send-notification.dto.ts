import { IsString, IsObject, IsOptional, IsArray, IsNumber } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  event: string;

  @IsObject()
  data: Record<string, any>;

  @IsOptional()
  @IsNumber()
  provinceId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  recipientUserIds?: number[];

  @IsOptional()
  @IsNumber()
  createdBy?: number;
}
