import { IBaseRepository } from '@shared/domain/repositories/base.repository.interface';
import { FloodRequest } from '../entities/flood-request.interface';
import { FloodRequestStatus } from '@shared/core/enums/floodRequestStatus.enum';
import { FloodRequestPurpose } from '@shared/core/enums/floodRequestPurpose.enum';
import { PaginatedResult } from '@shared/common/dtos/pagination.dto';

export interface QueryFloodRequestParams {
  provinceId?: number;
  status?: FloodRequestStatus;
  purpose?: FloodRequestPurpose;
  requesterId?: number;
  isApprovedForMap?: boolean;
}

export interface IFloodRequestRepository extends IBaseRepository<FloodRequest> {
  findAllPaginated(
    filters: QueryFloodRequestParams,
    pagination: { page: number; limit: number },
  ): Promise<PaginatedResult<FloodRequest>>;
}
