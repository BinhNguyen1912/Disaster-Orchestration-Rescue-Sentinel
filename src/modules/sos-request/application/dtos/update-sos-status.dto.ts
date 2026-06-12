import { SosStatus } from '@shared/core/enums/sosStatus.enum';

export interface UpdateSosStatusDto {
  status: SosStatus;
  resolutionNotes?: string;
}
