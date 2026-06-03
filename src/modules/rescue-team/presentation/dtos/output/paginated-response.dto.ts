export class PaginatedResponseDto {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  static from(
    entity: any[],
    total: number,
    page: number,
    limit: number,
    Mapper: any,
  ): PaginatedResponseDto {
    const dto = new PaginatedResponseDto();
    dto.items = entity.map((e) => Mapper.fromEntity(e));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
