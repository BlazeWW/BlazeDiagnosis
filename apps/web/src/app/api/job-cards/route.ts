import { createServiceRequestSchema } from '@/features/job-cards/schemas/jobCardSchema';
import {
  createServiceRequest,
  listServiceRequests,
} from '@/features/job-cards/services/jobCardService';
import { ServiceRequestRelationshipValidationError } from '@/features/job-cards/repositories/serviceRequestRepository';
import {
  apiCreated,
  apiError,
  apiOk,
  handleApiError,
} from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/job-cards';

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

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return apiError('BAD_REQUEST', 'Request body must be valid JSON.', 400);
      }
      throw error;
    }

    const input = createServiceRequestSchema.parse(body);
    const serviceRequest = await createServiceRequest(tenant.tenantId, input);

    return apiCreated({ serviceRequest });
  } catch (error) {
    if (error instanceof ServiceRequestRelationshipValidationError) {
      console.error(`POST ${routeName} failed:`, error);
      return apiError(
        'CONFLICT',
        'The customer and vehicle relationship is invalid.',
        409,
      );
    }

    return handleApiError(`POST ${routeName}`, error);
  }
}
