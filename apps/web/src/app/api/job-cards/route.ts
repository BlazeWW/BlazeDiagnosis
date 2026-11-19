import { createServiceRequestSchema } from '@/features/job-cards/schemas/jobCardSchema';
import {
  createServiceRequest,
  getWorkshopBoard,
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

// Job cards for the staffing and labour panels. Service requests are listed at /api/service-requests.
export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const board = await getWorkshopBoard(tenant.tenantId);

    return apiOk({ jobCards: board }, { meta: { count: board.length } });
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
