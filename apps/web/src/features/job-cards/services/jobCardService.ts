import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  jobCards,
  jobNotes,
  jobStatusEvents,
  serviceRequests,
} from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';

import type { CreateServiceRequestInput } from '../schemas/jobCardSchema';

export async function createServiceRequest(
  tenantId: string,
  input: CreateServiceRequestInput,
) {
  await requireTenantPermission(tenantId, 'jobs.create');

  const [request] = await db
    .insert(serviceRequests)
    .values({
      tenantId,
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      requestedService: input.requestedService,
      customerConcern: input.customerConcern,
      preferredDate: input.preferredDate
        ? new Date(input.preferredDate)
        : undefined,
      status: 'received',
    })
    .returning();

  return request;
}

export async function convertServiceRequestToJobCard(
  tenantId: string,
  serviceRequestId: string,
) {
  await requireTenantPermission(tenantId, 'jobs.create');

  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.tenantId, tenantId),
          eq(serviceRequests.id, serviceRequestId),
        ),
      )
      .limit(1);

    if (!request) {
      throw new Error('Service request not found.');
    }

    const [jobCard] = await tx
      .insert(jobCards)
      .values({
        tenantId,
        serviceRequestId,
        customerId: request.customerId,
        vehicleId: request.vehicleId,
        jobNumber: `JOB-${Date.now()}`,
      })
      .returning();

    await tx
      .update(serviceRequests)
      .set({ status: 'converted' })
      .where(
        and(
          eq(serviceRequests.tenantId, tenantId),
          eq(serviceRequests.id, serviceRequestId),
        ),
      );

    await tx.insert(jobStatusEvents).values({
      tenantId,
      jobCardId: jobCard.id,
      toStatus: 'request_received',
      statusType: 'internal',
      note: 'Job card created from service request.',
    });

    return jobCard;
  });
}

export async function addJobNote(
  tenantId: string,
  jobCardId: string,
  body: string,
  visibility: 'internal' | 'customer',
) {
  await requireTenantPermission(
    tenantId,
    visibility === 'customer'
      ? 'jobs.add_customer_note'
      : 'jobs.add_internal_note',
  );

  const [note] = await db
    .insert(jobNotes)
    .values({
      tenantId,
      jobCardId,
      body,
      visibility,
    })
    .returning();

  return note;
}

export async function getWorkshopBoard(tenantId: string) {
  await requireTenantPermission(tenantId, 'jobs.read');

  return db
    .select()
    .from(jobCards)
    .where(eq(jobCards.tenantId, tenantId))
    .orderBy(desc(jobCards.createdAt));
}
