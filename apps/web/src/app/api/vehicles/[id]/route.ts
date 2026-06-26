import {
  deleteVehicle,
  //listVehiclesForCustomer,
  getVehicleById
} from '@/features/vehicles/services/vehicleService';
import { apiOk, handleApiError, apiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/vehicles/[id]';

export async function GET(_request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const vehicle = await getVehicleById(tenant.tenantId, id);

    if (!vehicle){
      return apiError('NOT_FOUND', 'Vehicle not found.', 404, { id });
    }

    return apiOk({ vehicle });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function DELETE(_request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    await deleteVehicle(tenant.tenantId, id);

    return apiOk({ id, message: 'Vehicle deleted successfully.' });
  } catch (error) {
    return handleApiError(`DELETE ${routeName}`, error);
  }
}
