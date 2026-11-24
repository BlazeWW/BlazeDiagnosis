import { assignStaffSchema } from '@/features/job-cards/schemas/jobCardSchema';
import { assignJobStaff } from '@/features/job-cards/services/jobCardService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/job-cards/[id]/staff';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: jobCardId } = await context.params;
    const tenant = await requireTenantContext();
    const input = assignStaffSchema.parse(await request.json());
    const jobCard = await assignJobStaff(tenant.tenantId, jobCardId, input);

    return apiOk({ jobCard });
  } catch (error) {
    return handleApiError(`PATCH ${routeName}`, error);
  }
}
