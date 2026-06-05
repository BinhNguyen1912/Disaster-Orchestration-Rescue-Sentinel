import {
  IsInt,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from 'class-validator';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export class AddMemberValidationDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsEnum(RoleInTeam)
  @IsNotEmpty()
  roleInTeam: RoleInTeam;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  specializationIds?: number[];
}
