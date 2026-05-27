import {
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export class AddMemberDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsEnum(RoleInTeam)
  @IsNotEmpty()
  roleInTeam: RoleInTeam;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  specializations?: number[];
}
