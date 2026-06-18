import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { METADATA_KEYS } from '../../common/constants/app.constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      METADATA_KEYS.IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<T>(err: Error, user: T): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
