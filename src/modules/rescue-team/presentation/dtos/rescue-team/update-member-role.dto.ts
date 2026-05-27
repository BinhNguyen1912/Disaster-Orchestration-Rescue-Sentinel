import { IsEnum, IsNotEmpty } from 'class-validator';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export class UpdateMemberRoleDto {
  @IsEnum(RoleInTeam)
  @IsNotEmpty()
  roleInTeam: RoleInTeam;
}
