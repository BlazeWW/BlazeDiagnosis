import { listServiceRequests } from '@/features/job-cards/services/jobCardService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/service-requests';

// Moved from GET /api/job-cards, which serves job cards to the staffing and labour panels.
export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const serviceRequests = await listServiceRequests(tenant.tenantId);

    return apiOk(
      { serviceRequests },
      { meta: { count: serviceRequests.length } },
    );
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}
