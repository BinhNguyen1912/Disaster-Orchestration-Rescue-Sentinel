import { Gender } from '@shared/core/enums/gender.enum';

export interface RegisterDto {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  nationalId: string;
  dateOfBirth: string;
  gender: Gender;
  provinceId: number;
}
