import { SetMetadata } from '@nestjs/common';
import { METADATA_KEYS } from '../constants/app.constants';

export const Roles = (...roles: string[]) =>
  SetMetadata(METADATA_KEYS.ROLES, roles);
