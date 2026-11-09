import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { vehicles } from '@/db/schema/vehicles';
import { createVehicleSchema } from '@/features/vehicles/schemas/vehicleSchema';
import { createVehicle } from '@/features/vehicles/services/vehicleService';
import { apiCreated, apiOk, handleApiError } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import { TenantAccessError } from '@/lib/authorization/guards';

const routeName = '/api/vehicles';

export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const data = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.tenantId, tenant.tenantId),
          eq(vehicles.isArchived, false),
        ),
      );

    return apiOk({ vehicles: data }, { meta: { count: data.length } });
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

    const input = createVehicleSchema.parse(rawBody);
    const vehicle = await createVehicle(tenant.tenantId, input);

    return apiCreated({ vehicle });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
