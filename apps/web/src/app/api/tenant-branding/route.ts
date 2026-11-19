import { tenantBrandingSchema } from '@/features/tenants/schemas/tenantBrandingSchema';
import {
  getTenantBrandingConfig,
  updateTenantBrandingConfig,
} from '@/features/tenants/services/tenantService';
import { apiOk, handleApiError } from '@/lib/api/response';
import { TenantAccessError } from '@/lib/authorization/guards';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/tenant-branding';

export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const branding = await getTenantBrandingConfig(tenant.tenantId);

    return apiOk({ branding });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function PUT(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const rawBody = await request.json();

    if (rawBody.tenantId && rawBody.tenantId !== tenant.tenantId) {
      throw new TenantAccessError('Submitted tenant ID conflicts with authenticated session tenant.');
    }

    const input = tenantBrandingSchema.parse(rawBody);
    const branding = await updateTenantBrandingConfig(tenant.tenantId, input);

    return apiOk({ branding });
  } catch (error) {
    return handleApiError(`PUT ${routeName}`, error);
  }
}
