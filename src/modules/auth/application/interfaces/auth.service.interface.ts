import { User } from '@modules/auth/domain/entities/user';

export interface IAuthService {
  validateUser(
    identifier: string,
    pass: string,
    provinceId?: number,
  ): Promise<User | null>;
  login(user: User, ipAddress?: string, userAgent?: string): Promise<any>;
  register(dto: any): Promise<any>;
  adminRegister(dto: any, createdBy: number): Promise<any>;
  refresh(token: string, ipAddress?: string, userAgent?: string): Promise<any>;
  logout(token: string): Promise<any>;
  forgotPassword(identifier: string): Promise<any>;
  resetPassword(
    resetToken: string,
    otp: string,
    newPassword: string,
  ): Promise<any>;
}
