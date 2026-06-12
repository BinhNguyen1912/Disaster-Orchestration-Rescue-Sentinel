import { SosRequestType } from '@shared/core/enums/sosType.enum';
import { Severity } from '@shared/core/enums/level.enum';

export interface CreateSosRequestDto {
  requesterName?: string;
  requesterPhone?: string;
  requestType: SosRequestType;
  latitude: number;
  longitude: number;
  description?: string;
  severity: Severity;
  provinceId: number;
  adminUnitId: number;
  trappedPeopleCount: number;
  specialNeedsTags?: string[];
  imageUrls: string[];
}
