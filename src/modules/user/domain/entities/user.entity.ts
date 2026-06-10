import { Gender } from '@shared/core/enums/gender.enum';

export interface User {
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
  passwordResetOtp?: string;
  passwordResetOtpExpires?: Date;
  passwordResetToken?: string;
  avatarUrl?: string;
  nationalIdFrontUrl?: string;
  nationalIdBackUrl?: string;
  addressDetail?: string;
  homeLocation?: any;
  currentLocation?: any;
  trustScore: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt?: Date;
  deletedAt?: Date;
}
