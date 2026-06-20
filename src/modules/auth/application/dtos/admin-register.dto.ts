import { Gender } from '@shared/core/enums/gender.enum';

export interface AdminRegisterDto {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  nationalId: string;
  dateOfBirth: string;
  gender: Gender;
  provinceId: number;
  roleId: number;
  adminUnitId?: number;
  addressDetail?: string;
}
