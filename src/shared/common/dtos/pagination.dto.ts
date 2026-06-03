import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsEnum, IsString } from 'class-validator';

export class PaginationParams {
  @ApiPropertyOptional({ example: 1, description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Số item mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Trường sắp xếp' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Thứ tự sắp xếp',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class PaginatedResult<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}
