import { SetMetadata } from '@nestjs/common';

export const CSRF_PROTECTION_KEY = 'csrf_protection';
export const CsrfProtection = () => SetMetadata(CSRF_PROTECTION_KEY, true);
