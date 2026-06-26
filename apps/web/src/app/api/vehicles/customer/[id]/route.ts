import { listVehiclesForCustomer } from '@/features/vehicles/services/vehicleService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/vehicles/customer/[customerId]';

export async function GET(_request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const vehicles = await listVehiclesForCustomer(tenant.tenantId, id);

    return apiOk({ vehicles }, { meta: { count: vehicles.length } });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}