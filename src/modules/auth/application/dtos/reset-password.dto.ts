export interface ResetPasswordDto {
  resetToken: string;
  otp: string;
  newPassword: string;
}
