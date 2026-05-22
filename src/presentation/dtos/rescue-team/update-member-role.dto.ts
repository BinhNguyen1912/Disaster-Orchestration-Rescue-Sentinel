import { IsEnum, IsNotEmpty } from 'class-validator';
import { RoleInTeam } from '@domain/enums/roleInTeam.enum';

export class UpdateMemberRoleDto {
  @IsEnum(RoleInTeam)
  @IsNotEmpty()
  roleInTeam: RoleInTeam;
}
