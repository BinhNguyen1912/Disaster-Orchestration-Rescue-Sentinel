import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export interface AddMemberDto {
  userId: number;
  roleInTeam: RoleInTeam;
}
