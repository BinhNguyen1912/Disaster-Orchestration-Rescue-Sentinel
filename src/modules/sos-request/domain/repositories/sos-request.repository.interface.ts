import { IBaseRepository } from '@shared/domain/repositories/base.repository.interface';
import { SosRequest } from '../entities/sos-request.entity';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { Severity } from '@shared/core/enums/level.enum';
import { PaginatedResult } from '@shared/common/dtos/pagination.dto';

export interface QuerySosParams {
  provinceId?: number;
  status?: SosStatus;
  requestType?: SosRequestType;
  severity?: Severity;
  assignedTeamId?: number;
  requesterId?: number;
}

export interface ISosRequestRepository extends IBaseRepository<SosRequest> {
  findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    status?: SosStatus,
  ): Promise<(SosRequest & { distance_km: number })[]>;

  findAllPaginated(
    filters: QuerySosParams,
    pagination: { page: number; limit: number },
  ): Promise<PaginatedResult<SosRequest>>;
}
