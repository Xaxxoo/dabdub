export interface JwtPayload {
  sub: string; // user ID
  email: string;
  username: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string; // refresh token entity ID for lookup and rotation
  iat?: number;
  exp?: number;
}
