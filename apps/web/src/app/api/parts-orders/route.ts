import {
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
} from '@/features/parts/schemas/purchaseOrderSchema';
import { purchaseOrderErrorResponse } from '@/features/parts/services/purchaseOrderHttp';
import {
  createPurchaseOrder,
  listPurchaseOrders,
} from '@/features/parts/services/purchaseOrderService';
import { apiCreated, apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/parts-orders';

export async function GET(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const { searchParams } = new URL(request.url);
    const query = listPurchaseOrdersQuerySchema.parse({
      jobCardId: searchParams.get('jobCardId') ?? undefined,
    });
    const orders = await listPurchaseOrders(tenant.tenantId, query);

    return apiOk({ orders }, { meta: { count: orders.length } });
  } catch (error) {
    return respond(error, `GET ${routeName}`);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const input = createPurchaseOrderSchema.parse(await request.json());
    const order = await createPurchaseOrder(
      tenant.tenantId,
      input.supplierResponseId,
    );

    return apiCreated({ order });
  } catch (error) {
    return respond(error, `POST ${routeName}`);
  }
}

function respond(error: unknown, route: string) {
  return purchaseOrderErrorResponse(error) ?? handleApiError(route, error);
}
