import { correctLabourEntrySchema } from '@/features/job-cards/schemas/jobWorkSchema';
import { correctLabourEntry } from '@/features/job-cards/services/jobWorkService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/job-cards/[id]/labour/[entryId]';

export async function PATCH(
  request: Request,
  { params }: ApiRouteContext<{ id: string; entryId: string }>,
) {
  try {
    const { id, entryId } = await params;
    const tenant = await requireTenantContext();
    const input = correctLabourEntrySchema.parse(await request.json());
    const labourEntry = await correctLabourEntry(
      tenant.tenantId,
      id,
      entryId,
      input,
    );

    return apiOk({ labourEntry });
  } catch (error) {
    return handleApiError(`PATCH ${routeName}`, error);
  }
}
