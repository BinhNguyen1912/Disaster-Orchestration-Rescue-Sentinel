import { CreateSosRequestDto } from '../dtos/create-sos-request.dto';
import { QuerySosRequestDto } from '../dtos/query-sos-request.dto';
import { UpdateSosStatusDto } from '../dtos/update-sos-status.dto';
import { AssignTeamDto } from '../dtos/assign-team.dto';
import { CancelSosRequestDto } from '../dtos/cancel-sos-request.dto';
import { SosRequest } from '../../domain/entities/sos-request.entity';
import { AccessTokenPayload } from '../../../auth/domain/interfaces/jwt-payload.interface';
import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { PaginatedResult } from '@shared/common/dtos/pagination.dto';

export interface ISosRequestService {
  create(
    dto: CreateSosRequestDto,
    user?: AccessTokenPayload,
  ): Promise<SosRequest>;
  findAll(
    dto: QuerySosRequestDto,
    user: AccessTokenPayload,
  ): Promise<PaginatedResult<SosRequest>>;
  findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    status: SosStatus,
    user: AccessTokenPayload,
  ): Promise<(SosRequest & { distance_km: number })[]>;
  updateStatus(
    id: number,
    dto: UpdateSosStatusDto,
    user: AccessTokenPayload,
  ): Promise<SosRequest>;
  assignTeam(
    id: number,
    dto: AssignTeamDto,
    user: AccessTokenPayload,
  ): Promise<SosRequest>;
  cancel(
    id: number,
    dto: CancelSosRequestDto,
    user?: AccessTokenPayload,
  ): Promise<SosRequest>;
}
