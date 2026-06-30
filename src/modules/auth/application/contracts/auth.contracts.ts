import { Gender } from '@shared/core/enums/gender.enum';
import { User } from '../../domain/entities/user';

export interface BaseResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface AuthUserResponse {
  id: number;
  fullName: string;
  email?: string;
  phone: string;
  provinceId: number;
  role?: string;
}

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

export interface RegisterInput {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  nationalId?: string;
  dateOfBirth: string;
  gender: Gender;
  provinceId: number;
  adminUnitId?: number;
  addressDetail?: string;
  isVolunteer?: boolean;
  needsHelp?: boolean;
}

export interface AdminRegisterInput extends RegisterInput {
  roleId: number;
}

export function toAuthUserResponse(user: User): AuthUserResponse {
  const activeRole = user.userRoles?.find((ur) => ur.isActive && ur.role);
  const role = activeRole ? activeRole.role?.name : undefined;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    provinceId: user.provinceId,
    role,
  };
}
