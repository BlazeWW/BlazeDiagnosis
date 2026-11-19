import { createLabourEntrySchema } from '@/features/job-cards/schemas/jobWorkSchema';
import { addLabourEntry } from '@/features/job-cards/services/jobWorkService';
import { apiCreated, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/job-cards/[id]/labour';

export async function POST(request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const input = createLabourEntrySchema.parse(await request.json());
    const labourEntry = await addLabourEntry(tenant.tenantId, id, input);

    return apiCreated({ labourEntry });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
