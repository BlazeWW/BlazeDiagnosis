import { createCustomerSchema } from '@/features/customers/schemas/customerSchema';
import {
  createCustomer,
  searchCustomers,
} from '@/features/customers/services/customerService';
import { apiCreated, apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import { TenantAccessError } from '@/lib/authorization/guards';

const routeName = '/api/customers';

export async function GET(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';
    const customers = await searchCustomers(tenant.tenantId, query);

    return apiOk({ customers }, { meta: { count: customers.length } });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const rawBody = await request.json();

    if (rawBody.tenantId && rawBody.tenantId !== tenant.tenantId) {
      throw new TenantAccessError('Submitted tenant ID conflicts with authenticated session tenant.');
    }

    const input = createCustomerSchema.parse(rawBody);
    const customer = await createCustomer(tenant.tenantId, input);

    return apiCreated({ customer });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
