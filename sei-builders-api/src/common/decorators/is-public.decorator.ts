import { SetMetadata } from '@nestjs/common';
import { METADATA_KEYS } from '../constants/app.constants';

export const IsPublic = () => SetMetadata(METADATA_KEYS.IS_PUBLIC, true);
