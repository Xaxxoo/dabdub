import { SetMetadata } from '@nestjs/common';
import { METADATA_KEYS } from '../constants/app.constants';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(METADATA_KEYS.PERMISSIONS, permissions);
