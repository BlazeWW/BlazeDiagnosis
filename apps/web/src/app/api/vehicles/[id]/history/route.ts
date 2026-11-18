import { getVehicleServiceHistory } from '@/features/vehicles/services/vehicleHistoryService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/vehicles/[id]/history';

// Staff vs customer view is decided server-side from the session, never from query params.
export async function GET(_request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const history = await getVehicleServiceHistory(tenant.tenantId, id);

    return apiOk({ history });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}
