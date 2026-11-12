import { getVehicleServiceHistory } from '@/features/vehicles/services/vehicleHistoryService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';
import type { VehicleHistoryAudience } from '@/types/vehicles';

const routeName = '/api/vehicles/[id]/history';

export async function GET(request: Request, { params }: ApiRouteContext) {
    try {
        const { id } = await params;
        const tenant = requireTenantContext();
        const url = new URL(request.url);
        const audineceParam = url.searchParams.get('audience');
        const audience: VehicleHistoryAudience = audineceParam === 'customer' ? 'customer' : 'staff';
        const customerId = url.searchParams.get('customerId') ?? undefined;

        const history = await getVehicleServiceHistory(
            (await tenant).tenantId,
            id,
            audience,
            customerId
        );
        return apiOk({ history });
    } catch (error) {
        return handleApiError(`${routeName}`, error);
    }
}