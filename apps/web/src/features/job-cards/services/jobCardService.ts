import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  jobCards,
  jobNotes,
  jobStatusEvents,
  serviceRequests,
} from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';
import { DatabaseServiceRequestRepository } from '../repositories/databaseServiceRequestRepository';
import type { ServiceRequestRepository } from '../repositories/serviceRequestRepository';

import type { CreateServiceRequestInput } from '../schemas/jobCardSchema';

const serviceRequestRepository: ServiceRequestRepository =
  new DatabaseServiceRequestRepository();

export async function createServiceRequest(
  tenantId: string,
  input: CreateServiceRequestInput,
) {
  await requireTenantPermission(tenantId, 'jobs.create');

  return serviceRequestRepository.create(tenantId, input);
}

export async function listServiceRequests(tenantId: string) {
  await requireTenantPermission(tenantId, 'jobs.read');

  return serviceRequestRepository.list(tenantId);
}

export async function getServiceRequestById(
  tenantId: string,
  serviceRequestId: string,
) {
  await requireTenantPermission(tenantId, 'jobs.read');

  return serviceRequestRepository.getById(tenantId, serviceRequestId);
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
