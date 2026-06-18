import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { METADATA_KEYS } from '../constants/app.constants';
import { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      METADATA_KEYS.PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: UserEntity = request.user;

    if (!user) return false;
    if (user.isSuperAdmin) return true;

    const userPerms = new Set(user.permissions);
    const hasAll = required.every((p) => userPerms.has(p));

    if (!hasAll) {
      const missing = required.filter((p) => !userPerms.has(p));
      throw new ForbiddenException(
        `Missing permissions: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
