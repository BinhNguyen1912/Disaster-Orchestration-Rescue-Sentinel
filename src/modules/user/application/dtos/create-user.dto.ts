import { Gender } from '@shared/core/enums/gender.enum';

export interface CreateUserDto {
  provinceId: number;
  adminUnitId?: number;
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  gender: Gender;
  phone: string;
  email?: string;
  password?: string;
  roleId?: number;
}
