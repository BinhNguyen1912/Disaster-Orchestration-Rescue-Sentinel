export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: any;
}

export interface ForgotPasswordResponseDto {
  resetToken: string;
}

export interface RefreshResponseDto {
  accessToken: string;
  refreshToken: string;
}
