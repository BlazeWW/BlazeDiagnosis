import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  customers,
  jobCards,
  jobStatusEvents,
  serviceRequests,
  vehicles,
} from '@/db/schema';

import type {
  CreateServiceRequestInputDto,
  CreateServiceRequestResponseDto,
} from '@blaze-diagnostics/shared';
import type { ServiceRequestRepository } from './serviceRequestRepository';
import { ServiceRequestRelationshipValidationError } from './serviceRequestRepository';

export class DatabaseServiceRequestRepository implements ServiceRequestRepository {
  async create(
    tenantId: string,
    input: CreateServiceRequestInputDto,
  ): Promise<CreateServiceRequestResponseDto> {
    return db.transaction(async (tx) => {
      const [customer] = await tx
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.tenantId, tenantId),
            eq(customers.isArchived, false),
          ),
        )
        .limit(1);

      if (!customer) {
        throw new ServiceRequestRelationshipValidationError(
          'The customer is missing, archived, or does not belong to this tenant.',
        );
      }

      const [vehicle] = await tx
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.id, input.vehicleId),
            eq(vehicles.tenantId, tenantId),
            eq(vehicles.isArchived, false),
          ),
        )
        .limit(1);

      if (!vehicle) {
        throw new ServiceRequestRelationshipValidationError(
          'The vehicle is missing, archived, or does not belong to this tenant.',
        );
      }
      if (vehicle.primaryCustomerId !== customer.id) {
        throw new ServiceRequestRelationshipValidationError(
          'The vehicle must be associated with the selected customer.',
        );
      }

      const [request] = await tx
        .insert(serviceRequests)
        .values({
          tenantId,
          customerId: customer.id,
          vehicleId: vehicle.id,
          requestedService: input.requestedService,
          customerConcern: input.customerConcern,
          preferredDate: input.preferredDate
            ? new Date(input.preferredDate)
            : undefined,
          status: 'received',
        })
        .returning();

      const [jobCard] = await tx
        .insert(jobCards)
        .values({
          tenantId,
          serviceRequestId: request.id,
          customerId: customer.id,
          vehicleId: vehicle.id,
          jobNumber: `JOB-${Date.now()}-${globalThis.crypto.randomUUID()}`,
        })
        .returning({ id: jobCards.id });

      await tx.insert(jobStatusEvents).values({
        tenantId,
        jobCardId: jobCard.id,
        toStatus: 'request_received',
        statusType: 'internal',
        note: 'Job card created from service request.',
      });

      return toResponse(request);
    });
  }

  async list(tenantId: string): Promise<CreateServiceRequestResponseDto[]> {
    const requests = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.tenantId, tenantId))
      .orderBy(desc(serviceRequests.createdAt));

    return requests.map(toResponse);
  }

  async getById(
    tenantId: string,
    serviceRequestId: string,
  ): Promise<CreateServiceRequestResponseDto | null> {
    const [request] = await db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.tenantId, tenantId),
          eq(serviceRequests.id, serviceRequestId),
        ),
      )
      .limit(1);

    return request ? toResponse(request) : null;
  }
}

function toResponse(
  request: typeof serviceRequests.$inferSelect,
): CreateServiceRequestResponseDto {
  return {
    id: request.id,
    customerId: request.customerId,
    vehicleId: request.vehicleId,
    requestedService: request.requestedService,
    ...(request.customerConcern !== null && {
      customerConcern: request.customerConcern,
    }),
    ...(request.preferredDate !== null && {
      preferredDate: request.preferredDate.toISOString(),
    }),
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}
