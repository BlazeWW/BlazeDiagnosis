import { getJobWork } from '@/features/job-cards/services/jobWorkService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/job-cards/[id]/work';

// Labour entries + notes. Staff vs customer view is decided server-side from the session.
export async function GET(_request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const work = await getJobWork(tenant.tenantId, id);

    return apiOk({ work });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}
