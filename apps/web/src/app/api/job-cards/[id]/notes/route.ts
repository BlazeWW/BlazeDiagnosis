import { createJobNoteSchema } from '@/features/job-cards/schemas/jobWorkSchema';
import { addJobNote } from '@/features/job-cards/services/jobWorkService';
import { apiCreated, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/job-cards/[id]/notes';

export async function POST(request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const input = createJobNoteSchema.parse(await request.json());
    const note = await addJobNote(tenant.tenantId, id, input);

    return apiCreated({ note });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
