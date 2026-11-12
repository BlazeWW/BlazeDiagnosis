import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  intakeInspections,
  jobCards,
  jobNotes,
  serviceRequests,
  vehicleCustomers,
  vehicleOdometerReadings,
  vehicles,
} from '@/db/schema';
import { requireTenantPermission } from '@/lib/authorization/guards';

import type {
  VehicleHistoryAudience,
  VehicleHistoryInspection,
  VehicleServiceHistory,
} from '@/types/vehicles';

const HISTORY_LIMIT = 50;

type VehicleRow = typeof vehicles.$inferSelect;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function assertCustomerOwnsVehicle(
  tenantId: string,
  vehicle: VehicleRow,
  customerId: string | undefined,
) {
  if (!customerId) {
    throw new Error('Customer ownership could not be verified');
  }

  if (vehicle.primaryCustomerId === customerId) {
    return;
  }

  const [link] = await db
    .select({ id: vehicleCustomers.id })
    .from(vehicleCustomers)
    .where(
      and(
        eq(vehicleCustomers.tenantId, tenantId),
        eq(vehicleCustomers.vehicleId, vehicle.id),
        eq(vehicleCustomers.customerId, customerId),
      ),
    )
    .limit(1);

  if (!link) {
    throw new Error('Vehicle does not belong to this customer.');
  }
}

export async function getVehicleServiceHistory(
  tenantId: string,
  vehicleId: string,
  audience: VehicleHistoryAudience = 'staff',
  customerId?: string,
): Promise<VehicleServiceHistory> {
  await requireTenantPermission(tenantId, 'vehicles.read');

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.id, vehicleId),
        eq(vehicles.isArchived, false),
      ),
    )
    .limit(1);

  if (!vehicle) {
    throw new Error('Vehicle not found.');
  }

  if (audience === 'customer') {
    await assertCustomerOwnsVehicle(tenantId, vehicle, customerId);
  }

  const jobRows = await db
    .select({
      completedAt: jobCards.completedAt,
      createdAt: jobCards.createdAt,
      customerStatus: jobCards.customerStatus,
      id: jobCards.id,
      internalStatus: jobCards.internalStatus,
      jobNumber: jobCards.jobNumber,
      priority: jobCards.priority,
    })
    .from(jobCards)
    .where(
      and(eq(jobCards.tenantId, tenantId), eq(jobCards.vehicleId, vehicleId)),
    )
    .orderBy(desc(jobCards.createdAt))
    .limit(HISTORY_LIMIT);

  const jobIds = jobRows.map((job) => job.id);

  const noteRows = jobIds.length
    ? await db
        .select({
          body: jobNotes.body,
          createdAt: jobNotes.createdAt,
          jobCardId: jobNotes.jobCardId,
          visibility: jobNotes.visibility,
        })
        .from(jobNotes)
        .where(
          and(
            eq(jobNotes.tenantId, tenantId),
            inArray(jobNotes.jobCardId, jobIds),
          ),
        )
        .orderBy(desc(jobNotes.createdAt))
    : [];

  const notesByJob = new Map<
    string,
    VehicleServiceHistory['jobs'][number]['notes']
  >();

  for (const note of noteRows) {
    if (audience === 'customer' && note.visibility !== 'customer') {
      continue;
    }

    const list = notesByJob.get(note.jobCardId) ?? [];
    list.push({
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      visibility: note.visibility,
    });
    notesByJob.set(note.jobCardId, list);
  }

  const requestRows = await db
    .select({
      createdAt: serviceRequests.createdAt,
      customerConcern: serviceRequests.customerConcern,
      id: serviceRequests.id,
      preferredDate: serviceRequests.preferredDate,
      requestedService: serviceRequests.requestedService,
      status: serviceRequests.status,
    })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.tenantId, tenantId),
        eq(serviceRequests.vehicleId, vehicleId),
      ),
    )
    .orderBy(desc(serviceRequests.createdAt))
    .limit(HISTORY_LIMIT);

  const inspectionRows = await db
    .select({
      completedAt: intakeInspections.completedAt,
      conditionNotes: intakeInspections.conditionNotes,
      fuelLevel: intakeInspections.fuelLevel,
      id: intakeInspections.id,
      mileage: intakeInspections.mileage,
    })
    .from(intakeInspections)
    .where(
      and(
        eq(intakeInspections.tenantId, tenantId),
        eq(intakeInspections.vehicleId, vehicleId),
      ),
    )
    .orderBy(desc(intakeInspections.createdAt))
    .limit(HISTORY_LIMIT);

  const odometerRows = await db
    .select({
      reading: vehicleOdometerReadings.reading,
      recordedAt: vehicleOdometerReadings.recordedAt,
      source: vehicleOdometerReadings.source,
    })
    .from(vehicleOdometerReadings)
    .where(
      and(
        eq(vehicleOdometerReadings.tenantId, tenantId),
        eq(vehicleOdometerReadings.vehicleId, vehicleId),
      ),
    )
    .orderBy(desc(vehicleOdometerReadings.recordedAt))
    .limit(HISTORY_LIMIT);
  return {
    generatedAt: new Date().toISOString(),
    inspections: inspectionRows.map((row) => {
      const inspection: VehicleHistoryInspection = {
        completedAt: toIso(row.completedAt),
        fuelLevel: row.fuelLevel,
        id: row.id,
        mileage: row.mileage,
      };

      if (audience === 'staff') {
        inspection.conditionNotes = row.conditionNotes;
      }

      return inspection;
    }),
    jobs: jobRows.map((job) => ({
      completedAt: toIso(job.completedAt),
      createdAt: job.createdAt.toISOString(),
      customerStatus: job.customerStatus,
      id: job.id,
      ...(audience === 'staff' ? { internalStatus: job.internalStatus } : {}),
      jobNumber: job.jobNumber,
      notes: notesByJob.get(job.id) ?? [],
      priority: job.priority,
    })),
    odometerReadings: odometerRows.map((row) => ({
      reading: row.reading,
      recordedAt: row.recordedAt.toISOString(),
      source: row.source,
    })),
    serviceRequests: requestRows.map((row) => ({
      createdAt: row.createdAt.toISOString(),
      customerConcern: row.customerConcern,
      id: row.id,
      preferredDate: toIso(row.preferredDate),
      requestedService: row.requestedService,
      status: row.status,
    })),
    vehicleId: vehicle.id,
  };
}
