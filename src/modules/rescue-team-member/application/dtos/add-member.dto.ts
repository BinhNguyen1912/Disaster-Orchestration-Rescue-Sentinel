import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export interface AddMemberDto {
  userId?: number | null;
  citizenName?: string | null;
  citizenPhone?: string | null;
  roleInTeam: RoleInTeam;
  specializationIds?: number[];
}
