import { z } from 'zod';

import { getServiceRequestById } from '@/features/job-cards/services/jobCardService';
import { apiError, apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/job-cards/[id]';
const serviceRequestIdSchema = z.string().uuid();

export async function GET(_request: Request, { params }: ApiRouteContext) {
  try {
    const { id } = await params;
    const tenant = await requireTenantContext();
    const serviceRequestId = serviceRequestIdSchema.parse(id);
    const serviceRequest = await getServiceRequestById(
      tenant.tenantId,
      serviceRequestId,
    );

    if (!serviceRequest) {
      return apiError('NOT_FOUND', 'Job card not found.', 404);
    }

    return apiOk({ serviceRequest });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}
