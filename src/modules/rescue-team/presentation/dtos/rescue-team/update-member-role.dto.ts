import { IsEnum, IsNotEmpty } from 'class-validator';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export class UpdateMemberRoleValidationDto {
  @IsEnum(RoleInTeam)
  @IsNotEmpty()
  roleInTeam: RoleInTeam;
}
