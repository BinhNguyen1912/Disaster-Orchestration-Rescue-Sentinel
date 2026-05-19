export interface JwtPayload {
  sub: number;
  provinceId: number;
  roleId?: number;
  email?: string;
  exp?: number;
  iat?: number;
}
