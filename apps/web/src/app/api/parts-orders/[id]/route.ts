import { purchaseOrderErrorResponse } from '@/features/parts/services/purchaseOrderHttp';
import { getPurchaseOrder } from '@/features/parts/services/purchaseOrderService';
import { apiError, apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/parts-orders/[id]';

export async function GET(_request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const result = await getPurchaseOrder(tenant.tenantId, id);

    if (!result) {
      return apiError('NOT_FOUND', 'Purchase order not found.', 404, { id });
    }

    return apiOk(result);
  } catch (error) {
    return (
      purchaseOrderErrorResponse(error) ??
      handleApiError(`GET ${routeName}`, error)
    );
  }
}
