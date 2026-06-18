import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';

export interface GithubOAuthUser {
  githubId: string;
  githubUsername: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  accessToken: string;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('github.clientId'),
      clientSecret: config.get<string>('github.clientSecret'),
      callbackURL: config.get<string>('github.callbackUrl'),
      scope: ['user:email', 'read:org'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: GithubOAuthUser) => void,
  ): Promise<void> {
    const emails: Array<{ value: string; primary?: boolean }> =
      profile.emails ?? [];
    const primaryEmail =
      emails.find((e) => e.primary)?.value ?? emails[0]?.value ?? null;

    const user: GithubOAuthUser = {
      githubId: profile.id,
      githubUsername: profile.username ?? profile.displayName ?? 'github-user',
      email: primaryEmail,
      fullName: profile.displayName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
      accessToken,
    };

    done(null, user);
  }
}
