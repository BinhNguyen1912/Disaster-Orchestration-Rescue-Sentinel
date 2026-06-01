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
}

export interface AdminRegisterInput extends RegisterInput {
  roleId: number;
}

export function toAuthUserResponse(user: User): AuthUserResponse {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    provinceId: user.provinceId,
  };
}
