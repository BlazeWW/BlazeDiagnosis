import { getWorkshopBoard } from '@/features/job-cards/services/jobCardService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = 'api/job-cards';

export async function GET() {
  try {
    const tenantContext = await requireTenantContext();
    const board = await getWorkshopBoard(tenantContext.tenantId);
    return apiOk({ jobCards: board }, { meta: { count: board.length } });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}
