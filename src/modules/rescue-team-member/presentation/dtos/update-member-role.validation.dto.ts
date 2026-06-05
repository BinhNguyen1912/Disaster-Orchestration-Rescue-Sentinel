import { IsEnum } from 'class-validator';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export class UpdateMemberRoleValidationDto {
  @IsEnum(RoleInTeam)
  roleInTeam: RoleInTeam;
}
