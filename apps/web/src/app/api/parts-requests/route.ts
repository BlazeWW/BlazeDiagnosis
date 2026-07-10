import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { parts } from '@/db/schema/parts';
import { createPartsCatalogSchema } from '@/features/parts/schemas/partsCatalogSchema';
import {
  apiCreated,
  apiOk,
  handleApiError,
} from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/parts-requests';

export async function GET() {
  try {
    const tenant = await requireTenantContext();

    const catalog = await db
      .select()
      .from(parts)
      .where(eq(parts.tenantId, tenant.tenantId));

    return apiOk({ catalog }, { meta: { count: catalog.length } });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const input = createPartsCatalogSchema.parse(await request.json());

    const [newPart] = await db
      .insert(parts)
      .values({
        name: input.name,
        partNumber: input.partNumber,
        sku: input.sku,
        brand: input.brand,
        category: input.category,
        description: input.description,
        costPrice: input.costPrice,
        retailPrice: input.retailPrice,
        quantityOnHand: input.quantityOnHand,
        tenantId: tenant.tenantId,
      })
      .returning();

    return apiCreated({ partId: newPart.id });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
