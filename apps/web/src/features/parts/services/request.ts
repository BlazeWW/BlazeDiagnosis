import { db } from '@/db/client';
import { partsRequestItems, partsRequests } from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';

import { createPurchaseOrder } from './purchaseOrderService';

export async function createPartsRequestWithItems(
  tenantId: string,
  jobCardId: string,
  staffId: string,
  items: Array<{ notes?: string; partId: string; quantity: number }>,
  notes?: string,
) {
  await requireTenantPermission(tenantId, 'parts.request');

  return db.transaction(async (tx) => {
    const [request] = await tx
      .insert(partsRequests)
      .values({
        jobCardId,
        notes,
        requestedByUserId: staffId,
        status: 'draft',
        tenantId,
      })
      .returning();

    if (items.length > 0) {
      const itemValues: (typeof partsRequestItems.$inferInsert)[] = items.map(
        (item) => ({
          notes: item.notes ?? null,
          partName: item.partId,
          partNumber: item.partId,
          partsRequestId: request.id,
          quantity: String(item.quantity || 1),
          tenantId,
        }),
      );

      await tx.insert(partsRequestItems).values(itemValues);
    }

    return request;
  });
}

export async function approveSupplierResponse(
  tenantId: string,
  supplierResponseId: string,
) {
  return createPurchaseOrder(tenantId, supplierResponseId);
}
