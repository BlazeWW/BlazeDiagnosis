import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db/client';
import { parts, partsRequests, partsRequestItems, deliveryStatuses } from '@/db/schema/parts';
import { supplierResponses } from '@/db/schema/suppliers';
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
  items: Array<{
    partId: string;
    quantity: string;
    notes?: string;
  }>;
}

export interface ICreateSupplierResponsePayload {
  partsRequestId: string;
  supplierId: string;
  subtotal: string;
  taxTotal: string;
  deliveryFee: string;
  notes?: string;
}


async function getTenant() {
  return await requireTenantContext();
}

export async function getTenantCatalogParts() {
  const tenant = await getTenant();
  return db.select().from(parts).where(eq(parts.tenantId, tenant.tenantId));
}

export async function createCatalogPartEntry(data: ICreatePartPayload) {
  const tenant = await getTenant();
  const [newPart] = await db.insert(parts).values({
    ...data,
    tenantId: tenant.tenantId,
  }).returning();
  return newPart;
}

export async function getTenantPartsRequests(jobCardId: string) {
  const tenant = await getTenant();
  return db.select().from(partsRequests).where(
    and(
      eq(partsRequests.tenantId, tenant.tenantId),
      eq(partsRequests.jobCardId, jobCardId)
    )
  );
}

export async function createPartsRequestDraft(input: ICreatePartsRequestPayload) {
  const tenant = await getTenant();
  
  return await db.transaction(async (tx) => {
    const [partsRequest] = await tx.insert(partsRequests).values({
      jobCardId: input.jobCardId,
      notes: input.notes,
      requestedByUserId: input.staffId,
      status: 'draft',
      tenantId: tenant.tenantId,
    }).returning();

    const itemValues = input.items.map(({ partId, quantity, notes }) => ({
      notes,
      partName: String(partId),
      partNumber: String(partId),
      partsRequestId: partsRequest.id,
      quantity: String(quantity),
      tenantId: tenant.tenantId,
    }));

    await tx.insert(partsRequestItems).values(itemValues);
    return partsRequest;
  });
}

export async function createSupplierResponse(data: ICreateSupplierResponsePayload) {
  const tenant = await getTenant();
  
  const [response] = await db.insert(supplierResponses).values({
    ...data,
    tenantId: tenant.tenantId,
  }).returning();

  return response;
}

export async function updateSurfaceDeliveryStatus(
  partsRequestId: string,
  supplierResponseId: string,
  currentSurfaceStatus: 'supplier_dispatched' | 'station_received' | 'customer_ready',
  notes?: string
) {
  const tenant = await getTenant();

  const [deliveryLog] = await db.insert(deliveryStatuses).values({
    partsRequestId,
    supplierResponseId,
    currentSurfaceStatus,
    notes,
    tenantId: tenant.tenantId,
  })
  .onConflictDoUpdate({
    target: [deliveryStatuses.partsRequestId],
    set: {
      currentSurfaceStatus,
      notes,
      updatedAt: new Date(),
    },
  })
  .returning();

  return deliveryLog;
}

async function handleAction(action: () => Promise<any>, path: string) {
  try {
    const data = await action();
    revalidatePath(path);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred.' };
  }
}

export async function addPartToCatalogAction(payload: ICreatePartPayload) {
  'use server';
  return handleAction(() => createCatalogPartEntry(payload), '/parts-request');
}

export async function createPartsRequestAction(payload: ICreatePartsRequestPayload) {
  'use server';
  return handleAction(() => createPartsRequestDraft(payload), '/parts-requests');
}

export async function submitSupplierResponseAction(payload: ICreateSupplierResponsePayload) {
  'use server';
  return handleAction(() => createSupplierResponse(payload), '/supplier-responses');
}

export async function updateDeliveryStatusAction(
  partsRequestId: string,
  supplierResponseId: string,
  status: 'supplier_dispatched' | 'station_received' | 'customer_ready',
  notes?: string
) {
  'use server';
  return handleAction(() => updateSurfaceDeliveryStatus(partsRequestId, supplierResponseId, status, notes), '/parts-requests');
}
