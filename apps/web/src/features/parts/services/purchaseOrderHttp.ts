import { apiError } from '@/lib/api/response';
import { TenantAccessError } from '@/lib/authorization/guards';

import { PurchaseOrderError } from './purchaseOrderLifecycle';

const statusByCode = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
} as const;

export function purchaseOrderErrorResponse(error: unknown) {
  if (error instanceof PurchaseOrderError) {
    return apiError(error.code, error.message, statusByCode[error.code]);
  }

  if (error instanceof TenantAccessError) {
    return apiError('FORBIDDEN', 'Forbidden.', 403);
  }

  if (error instanceof Error && error.message === 'Authentication required.') {
    return apiError('UNAUTHORIZED', 'Authentication required.', 401);
  }

  return null;
}
