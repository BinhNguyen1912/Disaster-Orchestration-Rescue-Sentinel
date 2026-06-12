import { SosStatus } from '@shared/core/enums/sosStatus.enum';
import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { Severity } from '@shared/core/enums/level.enum';

export interface QuerySosRequestDto {
  provinceId?: number;
  status?: SosStatus;
  requestType?: SosRequestType;
  severity?: Severity;
  assignedTeamId?: number;
  page?: number;
  limit?: number;
}
