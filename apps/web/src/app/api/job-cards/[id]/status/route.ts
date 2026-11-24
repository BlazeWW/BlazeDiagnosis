import { z } from 'zod';

import { updateJobStatusSchema } from '@/features/job-cards/schemas/jobCardSchema';
import {
  JobCardNotFoundError,
  JobStatusConflictError,
  JobStatusReasonRequiredError,
  getJobCardStatus,
  transitionJobCardStatus,
} from '@/features/job-cards/services/jobStatusService';
import { apiError, apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { ApiRouteContext } from '@/types/api';

const routeName = '/api/job-cards/[id]/status';
const jobCardIdSchema = z.string().uuid();

export async function GET(_request: Request, context: ApiRouteContext) {
  try {
    const { id } = await context.params;
    const jobCardId = jobCardIdSchema.parse(id);
    const tenant = await requireTenantContext();
    const jobCard = await getJobCardStatus(tenant.tenantId, jobCardId);

    return apiOk({ jobCard });
  } catch (error) {
    if (error instanceof JobCardNotFoundError) {
      return apiError('NOT_FOUND', 'Job card not found.', 404);
    }

    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function PATCH(request: Request, context: ApiRouteContext) {
  try {
    const { id } = await context.params;
    const jobCardId = jobCardIdSchema.parse(id);
    const tenant = await requireTenantContext();
    const input = updateJobStatusSchema.parse(await request.json());
    const result = await transitionJobCardStatus(
      tenant.tenantId,
      jobCardId,
      input,
    );

    return apiOk(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError('BAD_REQUEST', 'Request body must be valid JSON.', 400);
    }

    if (error instanceof JobCardNotFoundError) {
      return apiError('NOT_FOUND', 'Job card not found.', 404);
    }

    if (error instanceof JobStatusConflictError) {
      return apiError('CONFLICT', error.message, 409);
    }

    if (error instanceof JobStatusReasonRequiredError) {
      return apiError('VALIDATION_ERROR', error.message, 422);
    }

    return handleApiError(`PATCH ${routeName}`, error);
  }
}
