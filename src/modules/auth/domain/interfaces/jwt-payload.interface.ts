export interface AccessTokenPayload {
  sub: number;
  provinceId: number;
  roleId?: number;
  email?: string;
  fullName?: string;
  phone?: string;
  exp?: number;
  iat?: number;
}
export interface RefreshTokenPayload {
  provinceId: number;
  sub: number;
  exp?: number;
  iat?: number;
}
