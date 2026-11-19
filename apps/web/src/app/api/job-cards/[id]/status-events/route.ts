import { z } from 'zod';

import {
  JobCardNotFoundError,
  getStationJobStatusTimeline,
} from '@/features/job-cards/services/jobStatusService';
import { apiError, apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/job-cards/[id]/status-events';
const jobCardIdSchema = z.string().uuid();

export async function GET(_request: Request, context: ApiRouteContext) {
  try {
    const { id } = await context.params;
    const jobCardId = jobCardIdSchema.parse(id);
    const tenant = await requireTenantContext();
    const statusEvents = await getStationJobStatusTimeline(
      tenant.tenantId,
      jobCardId,
    );

    return apiOk({ statusEvents });
  } catch (error) {
    if (error instanceof JobCardNotFoundError) {
      return apiError('NOT_FOUND', 'Job card not found.', 404);
    }

    return handleApiError(`GET ${routeName}`, error);
  }
}
