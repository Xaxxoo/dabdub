export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // seconds
  refreshTokenExpiresIn: number; // seconds
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    roles: string[];
    onboardingStatus: string;
  };
  tokens: AuthTokens;
}
