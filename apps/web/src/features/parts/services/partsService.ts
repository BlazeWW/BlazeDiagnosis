import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { jobCards } from '@/db/schema/jobs';

import { db } from '@/db/client';
import { parts, partsRequests, partsRequestItems } from '@/db/schema/parts';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';

export interface ICreatePartPayload {
  name: string;
  partNumber: string;
  sku?: string;
  brand?: string;
  category?: string;
  description?: string;
  costPrice?: string;
  retailPrice?: string;
  quantityOnHand?: string;
}

export interface ICreatePartsRequestPayload {
  jobCardId: string;
  staffId?: string;
  notes?: string;
  items: {
    partId: string;
    quantity: string;
    notes?: string;
  }[];
}

export interface ICreateSupplierResponsePayload {
  partsRequestId: string;
  supplierId: string;
  subtotal: string;
  taxTotal: string;
  deliveryFee: string;
  notes?: string;
}


export async function getTenantCatalogParts() {
  const tenant = await requireTenantContext();
  return await db
    .select()
    .from(parts)
    .where(eq(parts.tenantId, tenant.tenantId));
}

export async function createCatalogPartEntry(data: ICreatePartPayload) {
  const tenant = await requireTenantContext();
  const [newPart] = await db
    .insert(parts)
    .values({
      name: data.name,
      partNumber: data.partNumber,
      sku: data.sku,
      brand: data.brand,
      category: data.category,
      description: data.description,
      costPrice: data.costPrice,
      retailPrice: data.retailPrice,
      quantityOnHand: data.quantityOnHand,
      tenantId: tenant.tenantId,
    })
    .returning();
  return newPart;
}

export async function getTenantPartsRequests(jobCardId: string) {
  const tenant = await requireTenantContext();
  return await db
    .select()
    .from(partsRequests)
    .where(
      and(
        eq(partsRequests.tenantId, tenant.tenantId),
        eq(partsRequests.jobCardId, jobCardId)
      )
    );
}

export async function createPartsRequestDraft(input: ICreatePartsRequestPayload) {
  const tenant = await requireTenantContext();
  
  // 1. BD-031 FIX: Verify job card belongs to this tenant
  const jobCard = await db.query.jobCards.findFirst({
    where: and(
      eq(jobCards.id, input.jobCardId),
      eq(jobCards.tenantId, tenant.tenantId)
    )
  });

  if (!jobCard) {
    throw new Error('Job card not found or unauthorized');
  }

  // 2. BD-031 FIX: Validate quantities
  for (const item of input.items) {
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Invalid quantity');
    }
  }

  // 3. Proceed with the transaction
  return await db.transaction(async (tx) => {
    const [partsRequest] = await tx
      .insert(partsRequests)
      .values({
        jobCardId: input.jobCardId,
        notes: input.notes,
        requestedByUserId: input.staffId,
        status: 'draft',
        tenantId: tenant.tenantId,
      })
      .returning();

    const itemValues = input.items.map((item) => ({
      notes: item.notes,
      partName: String(item.partId),
      partNumber: String(item.partId),
      partsRequestId: partsRequest.id,
      quantity: String(item.quantity),
      tenantId: tenant.tenantId,
    }));

    await tx.insert(partsRequestItems).values(itemValues);
    return partsRequest;
  });
}


export async function addPartToCatalogAction(payload: ICreatePartPayload) {
  'use server';
  try {
    const item = await createCatalogPartEntry(payload);
    revalidatePath('/parts-request');
    return { success: true, data: item };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to append to stock logs.' 
    };
  }
}

export async function createPartsRequestAction(payload: ICreatePartsRequestPayload) {
  'use server';
  try {
    const requestDraft = await createPartsRequestDraft(payload);
    revalidatePath('/parts-requests');
    return { success: true, data: requestDraft };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit request draft.' 
    };
  }
}
