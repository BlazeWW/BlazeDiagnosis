import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db/client';
import { supplierResponses } from '@/db/schema/suppliers';
import { handleApiError, apiCreated, apiOk } from '@/lib/api/response';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

const routeName = '/api/supplier-responses';

const createResponseSchema = z.object({
  partsRequestId: z.string().uuid(),
  supplierId: z.string().uuid(),
  subtotal: z.string().default('0.00'),
  taxTotal: z.string().default('0.00'),
  deliveryFee: z.string().default('0.00'),
  notes: z.string().optional(),
});

// Exporting the GET function to retrieve supplier responses
export async function GET() {
  try {
    const tenant = await requireTenantContext();

    const responses = await db
      .select()
      .from(supplierResponses)
      .where(eq(supplierResponses.tenantId, tenant.tenantId));

    return apiOk({ responses }, { meta: { count: responses.length } });
  } catch (error) {
    return handleApiError(`GET ${routeName}`, error);
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requireTenantContext();
    const input = createResponseSchema.parse(await request.json());

    const calculatedTotal = calculateTotal(input.subtotal, input.taxTotal, input.deliveryFee);

    const [responseDraft] = await db
      .insert(supplierResponses)
      .values({
        tenantId: tenant.tenantId,
        partsRequestId: input.partsRequestId,
        supplierId: input.supplierId,
        status: 'submitted',
        subtotal: input.subtotal,
        taxTotal: input.taxTotal,
        deliveryFee: input.deliveryFee,
        total: calculatedTotal,
        notes: input.notes,
      })
      .returning();

    return apiCreated({ responseId: responseDraft.id });
  } catch (error) {
    return handleApiError(`POST ${routeName}`, error);
  }
}

function calculateTotal(subtotal: string, taxTotal: string, deliveryFee: string): string {
  return (parseFloat(subtotal) + parseFloat(taxTotal) + parseFloat(deliveryFee)).toFixed(2);
}
