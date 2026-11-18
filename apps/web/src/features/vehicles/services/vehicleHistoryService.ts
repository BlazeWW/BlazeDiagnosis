import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  customers,
  intakeInspections,
  jobCards,
  jobNotes,
  serviceRequests,
  vehicleCustomers,
  vehicleOdometerReadings,
  vehicles,
} from '@/db/schema';
import { ApiRequestError } from '@/lib/api/response';
import {
  requireTenantPermission,
  TenantAccessError,
} from '@/lib/authorization/guards';
import type { SystemRole } from '@/lib/constants/roles';

import type {
  VehicleHistoryAudience,
  VehicleHistoryInspection,
  VehicleServiceHistory,
} from '@/types/vehicles';

const HISTORY_LIMIT = 50;

// Only these roles see internal history. Every other role must prove it owns the vehicle.
const STAFF_ROLES: readonly SystemRole[] = [
  'site_manager',
  'floor_manager',
  'mechanic',
  'platform_admin',
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type VehicleRow = typeof vehicles.$inferSelect;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

// The customer is found from the signed-in user (customers.user_id), never from a client-supplied id.
async function findSessionCustomerId(tenantId: string, userId: string) {
  // customers.user_id is a UUID; identities that are not UUIDs (e.g. Auth0 ids) cannot be linked.
  if (!uuidPattern.test(userId)) {
    return null;
  }

  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.userId, userId)))
    .limit(1);

  return customer?.id ?? null;
}

async function customerOwnsVehicle(
  tenantId: string,
  vehicle: VehicleRow,
  customerId: string,
) {
  if (vehicle.primaryCustomerId === customerId) {
    return true;
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

  return Boolean(link);
}

export async function getVehicleServiceHistory(
  tenantId: string,
  vehicleId: string,
): Promise<VehicleServiceHistory> {
  const user = await requireTenantPermission(tenantId, 'vehicles.read');
  const audience: VehicleHistoryAudience =
    user.tenantRole && STAFF_ROLES.includes(user.tenantRole)
      ? 'staff'
      : 'customer';

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
    throw new ApiRequestError('NOT_FOUND', 404, 'Vehicle not found.');
  }

  if (audience === 'customer') {
    const customerId = await findSessionCustomerId(tenantId, user.id);

    if (
      !customerId ||
      !(await customerOwnsVehicle(tenantId, vehicle, customerId))
    ) {
      throw new TenantAccessError('Vehicle does not belong to this customer.');
    }
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
