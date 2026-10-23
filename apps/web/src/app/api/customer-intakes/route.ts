import { customerVehicleIntakeSchema } from '@/features/customers/schemas/customerVehicleIntakeSchema';
import {
  createCustomerVehicleIntake,
  getCustomerById,
} from '@/features/customers/services/customerService';
import {
  apiCreated,
  apiOk,
  handleApiError,
  handleMissingSearchParam,
  MissingSearchParamError,
  requireSearchParam,
} from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/customer-intakes';

export async function GET(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const { searchParams } = new URL(request.url);
    const customerId = requireSearchParam(searchParams, 'customerId');
    const customer = await getCustomerById(tenant.tenantId, customerId);

    if (!customer) {
      return apiError('NOT_FOUND', 'Customer not found.', 404, { id: customerId });
    }

    return apiOk({ intakes: [] }, { meta: { count: 0, customerId } });
  } catch (error) {
    if (error instanceof MissingSearchParamError) {
      return handleMissingSearchParam(error);
    }

    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const input = customerVehicleIntakeSchema.parse(await request.json());
    const intake = await createCustomerVehicleIntake(tenant.tenantId, input);

    return apiCreated({ intake });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
