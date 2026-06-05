import { IsInt, IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { RoleInTeam } from '@shared/core/enums/roleInTeam.enum';

export class AddMemberValidationDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  citizenName?: string;

  @IsOptional()
  @IsString()
  citizenPhone?: string;

  @IsEnum(RoleInTeam)
  roleInTeam: RoleInTeam;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  specializationIds?: number[];
}
