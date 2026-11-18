import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { users } from '@/db/schema/users';

import { db } from '@/db/client';
import { jobCards, jobStatusEvents, serviceRequests } from '@/db/schema';
import { ApiRequestError } from '@/lib/api/response';
import { createAuditLog } from '@/lib/audit';
import { requireTenantPermission } from '@/lib/authorization/guards';
import type { EligibleStaffMember } from '@/types/jobCards';

import type {
  AssignStaffInput,
  CreateServiceRequestInput,
} from '../schemas/jobCardSchema';

const MECHANIC_ROLE = 'mechanic' as const;
const FLOOR_MANAGER_ROLE = 'floor_manager' as const;

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
      preferredDate: input.preferredDate,
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

export async function getWorkshopBoard(tenantId: string) {
  await requireTenantPermission(tenantId, 'jobs.read');

  return db
    .select()
    .from(jobCards)
    .where(eq(jobCards.tenantId, tenantId))
    .orderBy(desc(jobCards.createdAt));
}

export async function getEligibleStaffMembers(
  tenantId: string,
): Promise<EligibleStaffMember[]> {
  await requireTenantPermission(tenantId, 'jobs.read');

  const staff = await db
    .select({
      userId: users.id,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        inArray(users.role, [MECHANIC_ROLE, FLOOR_MANAGER_ROLE]),
      ),
    );

  if (staff.length === 0) return [];

  const activeJobFilter = and(
    eq(jobCards.tenantId, tenantId),
    sql`${jobCards.internalStatus} NOT IN ('completed', 'cancelled')`,
  );

  const [asMechanic, asFloorManager] = await Promise.all([
    db
      .select({
        userId: jobCards.assignedMechanicId,
        count: sql<number>`count(*)::int`,
      })
      .from(jobCards)
      .where(
        and(activeJobFilter, sql`${jobCards.assignedMechanicId} IS NOT NULL`),
      )
      .groupBy(jobCards.assignedMechanicId),
    db
      .select({
        userId: jobCards.assignedFloorManagerId,
        count: sql<number>`count(*)::int`,
      })
      .from(jobCards)
      .where(
        and(
          activeJobFilter,
          sql`${jobCards.assignedFloorManagerId} IS NOT NULL`,
        ),
      )
      .groupBy(jobCards.assignedFloorManagerId),
  ]);

  const counts = new Map<string, number>();
  for (const row of [...asMechanic, ...asFloorManager]) {
    if (row.userId) {
      counts.set(row.userId, (counts.get(row.userId) ?? 0) + row.count);
    }
  }

  return staff.map((member) => ({
    ...member,
    activeJobCount: counts.get(member.userId) ?? 0,
  })) satisfies EligibleStaffMember[];
}

export async function assignJobStaff(
  tenantId: string,
  jobCardId: string,
  input: AssignStaffInput,
) {
  const actor = await requireTenantPermission(tenantId, 'jobs.assign');

  const result = await db.transaction(async (tx) => {
    //RS: Job must belong to session tenant - tenantId comes from
    // requireTenantContext() in the route, never from the request body.

    const [job] = await tx
      .select()
      .from(jobCards)
      .where(and(eq(jobCards.id, jobCardId), eq(jobCards.tenantId, tenantId)))
      .limit(1);

    if (!job) {
      throw new ApiRequestError('NOT_FOUND', 404, 'Job not found');
    }

    const staffChecks: Array<{
      field: 'mechanicId' | 'floorManagerId';
      requiredRole: string;
    }> = [
      {
        field: 'mechanicId',
        requiredRole: MECHANIC_ROLE,
      },
      {
        field: 'floorManagerId',
        requiredRole: FLOOR_MANAGER_ROLE,
      },
    ];

    const updates: Record<string, string | null> = {};

    for (const check of staffChecks) {
      const value = input[check.field];

      if (value === undefined) continue;

      if (value === null) {
        updates[
          check.field === 'mechanicId'
            ? 'assignedMechanicId'
            : 'assignedFloorManagerId'
        ] = null;
        continue;
      }

      // RS + R6: Staff must exist, same tenant, and hold the correct role

      const [staff] = await tx
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(
          and(
            eq(users.id, value),
            eq(users.tenantId, tenantId),
            eq(users.role, check.requiredRole),
          ),
        )
        .limit(1);

      if (!staff) {
        throw new ApiRequestError(
          'VALIDATION_ERROR',
          422,
          `Staff member not found or does not have the ${check.requiredRole} role`,
        );
      }

      updates[
        check.field === 'mechanicId'
          ? 'assignedMechanicId'
          : 'assignedFloorManagerId'
      ] = value;
    }

    if (Object.keys(updates).length === 0) {
      return { audit: null, jobCard: job };
    }

    const [updated] = await tx
      .update(jobCards)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(jobCards.id, jobCardId), eq(jobCards.tenantId, tenantId)))
      .returning();

    return {
      audit: {
        previousValue: {
          assignedMechanicId: job.assignedMechanicId,
          assignedFloorManagerId: job.assignedFloorManagerId,
        },
        newValue: updates,
      },
      jobCard: updated,
    };
  });

  if (result.audit) {
    await createAuditLog({
      tenantId,
      action: 'job_card.staff_assigned',
      entityType: 'job_card',
      entityId: jobCardId,
      previousValue: result.audit.previousValue,
      // shortcut: actor_user_id needs a users.id, but sessions only carry the Auth0 id; move this into actorUserId once users are linked to Auth0.
      newValue: {
        ...result.audit.newValue,
        actor: { authUserId: actor.id, email: actor.email },
      },
    });
  }

  return result.jobCard;
}
