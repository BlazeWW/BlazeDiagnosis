import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  supplierResponseItems,
  supplierResponses,
} from '@/db/schema/suppliers';
import { createSupplierResponseSchema } from '@/features/parts/schemas/supplierResponseSchema';
import {
  apiCreated,
  apiOk,
  handleApiError,
  handleMissingSearchParam,
  MissingSearchParamError,
  requireSearchParam,
} from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import { TenantAccessError } from '@/lib/authorization/guards';

const routeName = '/api/supplier-responses';

export async function GET(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const { searchParams } = new URL(request.url);
    const partsRequestId = requireSearchParam(searchParams, 'partsRequestId');

    const responses = await db
      .select()
      .from(supplierResponses)
      .where(
        and(
          eq(supplierResponses.tenantId, tenant.tenantId),
          eq(supplierResponses.partsRequestId, partsRequestId),
        ),
      );

    return apiOk({ responses }, { meta: { count: responses.length } });
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
    const rawBody = await request.json();

    if (rawBody.tenantId && rawBody.tenantId !== tenant.tenantId) {
      throw new TenantAccessError('Submitted tenant ID conflicts with authenticated session tenant.');
    }

    const input = createSupplierResponseSchema.parse(rawBody);

    const [response] = await db
      .insert(supplierResponses)
      .values({
        deliveryFee: String(input.deliveryFee ?? 0),
        eta: input.eta ? new Date(input.eta) : undefined,
        partsRequestId: input.partsRequestId,
        status: 'submitted',
        subtotal: String(input.subtotal),
        supplierId: input.supplierId,
        taxTotal: String(input.tax),
        tenantId: tenant.tenantId,
        total: String(input.total),
      })
      .returning();

    const itemValues: (typeof supplierResponseItems.$inferInsert)[] =
      input.items.map((item) => ({
        availabilityStatus: item.availability,
        brand: item.brand,
        partName: item.partName,
        partNumber: item.partNumber,
        partsRequestItemId: item.partId,
        quantityAvailable: String(item.quantityAvailable),
        supplierResponseId: response.id,
        tenantId: tenant.tenantId,
        unitPrice: String(item.unitPrice),
      }));

    await db.insert(supplierResponseItems).values(itemValues);

    return apiCreated({ response });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}
