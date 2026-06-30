import { Gender } from '@shared/core/enums/gender.enum';

export interface UserRole {
  roleId: number;
  provinceId: number;
  isActive: boolean;
  role?: {
    id: number;
    name: string;
  };
}

export class User {
  id: number;
  provinceId: number;
  adminUnitId?: number;
  fullName: string;
  nationalId: string;
  nationalIdVerified: boolean;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  phoneVerified: boolean;
  email?: string;
  emailVerified: boolean;
  password?: string;
  avatarUrl?: string;
  nationalIdFrontUrl?: string;
  nationalIdBackUrl?: string;
  addressDetail?: string;
  homeLocation?: any;
  currentLocation?: any;
  trustScore: number;
  isVerified: boolean;
  isActive: boolean;
  isVolunteer: boolean;
  needsHelp: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt?: Date;
  deletedAt?: Date;

  passwordResetOtp?: string;
  passwordResetOtpExpires?: Date;
  passwordResetToken?: string;

  userRoles: UserRole[] = [];

  getActiveRoleId(provinceId?: number): number | undefined {
    const targetProvinceId = provinceId ?? this.provinceId;
    if (!this.userRoles) return undefined;

    const activeUserRole = this.userRoles.find(
      (ur) => ur.provinceId === targetProvinceId && ur.isActive,
    );

    return activeUserRole?.roleId;
  }
}
