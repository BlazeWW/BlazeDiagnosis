import { purchaseOrderTransitionSchema } from '@/features/parts/schemas/purchaseOrderSchema';
import { purchaseOrderErrorResponse } from '@/features/parts/services/purchaseOrderHttp';
import { changePurchaseOrderStatus } from '@/features/parts/services/purchaseOrderService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/parts-orders/[id]/transitions';

export async function POST(request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const input = purchaseOrderTransitionSchema.parse(await request.json());
    const order = await changePurchaseOrderStatus(tenant.tenantId, id, input);

    return apiOk({ order });
  } catch (error) {
    return (
      purchaseOrderErrorResponse(error) ??
      handleApiError(`POST ${routeName}`, error)
    );
  }
}
