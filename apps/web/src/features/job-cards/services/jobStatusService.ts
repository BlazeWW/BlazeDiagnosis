import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  customers,
  jobCards,
  jobStatusEvents,
  quotes,
  tenantMembers,
} from '@/db/schema';
import { jobCustomerStatusEnum } from '@/db/schema/enums';
import { requireUser } from '@/lib/auth/session';
import {
  requireTenantPermission,
  TenantAccessError,
} from '@/lib/authorization/guards';

import type { UpdateJobStatusInput } from '../schemas/jobCardSchema';
import {
  getCustomerStatusForInternalStatus,
  isAllowedJobStatusTransition,
  requiresJobStatusManager,
  requiresJobStatusReason,
  type JobCustomerStatus,
  type JobInternalStatus,
} from './jobStatusRules';

const managerRoles = ['site_manager', 'floor_manager'] as const;
const customerStatuses = new Set<string>(jobCustomerStatusEnum.enumValues);

export class JobStatusConflictError extends Error {
  constructor(message = 'The requested status transition is not available.') {
    super(message);
    this.name = 'JobStatusConflictError';
  }
}

export class JobStatusReasonRequiredError extends Error {
  constructor() {
    super('A reason is required for this status transition.');
    this.name = 'JobStatusReasonRequiredError';
  }
}

export class JobCardNotFoundError extends Error {
  constructor() {
    super('Job card not found.');
    this.name = 'JobCardNotFoundError';
  }
}

export async function transitionJobCardStatus(
  tenantId: string,
  jobCardId: string,
  input: UpdateJobStatusInput,
) {
  const user = await requireTenantPermission(tenantId, 'jobs.update_status');
  const actorIdentity = user.id;

  if (!actorIdentity) {
    throw new TenantAccessError();
  }

  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobCards)
      .where(and(eq(jobCards.id, jobCardId), eq(jobCards.tenantId, tenantId)))
      .limit(1);

    if (!job) {
      throw new JobCardNotFoundError();
    }

    const fromStatus = job.internalStatus as JobInternalStatus;
    const toStatus = input.targetInternalStatus;

    if (!isAllowedJobStatusTransition(fromStatus, toStatus)) {
      throw new JobStatusConflictError();
    }

    if (requiresJobStatusReason(fromStatus, toStatus) && !input.reason) {
      throw new JobStatusReasonRequiredError();
    }

    if (requiresJobStatusManager(fromStatus, toStatus)) {
      const [membership] = await tx
        .select({ role: tenantMembers.role })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, tenantId),
            eq(tenantMembers.userId, actorIdentity),
            eq(tenantMembers.status, 'active'),
          ),
        )
        .limit(1);

      if (
        !membership ||
        !managerRoles.includes(membership.role as (typeof managerRoles)[number])
      ) {
        throw new TenantAccessError();
      }
    }

    if (
      fromStatus === 'awaiting_customer_approval' &&
      toStatus !== 'cancelled'
    ) {
      const [approvedQuote] = await tx
        .select({ id: quotes.id })
        .from(quotes)
        .where(
          and(
            eq(quotes.tenantId, tenantId),
            eq(quotes.jobCardId, jobCardId),
            inArray(quotes.status, ['approved', 'locked']),
          ),
        )
        .limit(1);

      if (!approvedQuote) {
        throw new JobStatusConflictError(
          'Customer approval is required before work or parts proceed.',
        );
      }
    }

    if (job.statusVersion !== input.expectedStatusVersion) {
      throw new JobStatusConflictError(
        'The job card changed. Refresh it before trying again.',
      );
    }

    const now = new Date();
    const customerStatus = getCustomerStatusForInternalStatus(toStatus);
    const [updatedJobCard] = await tx
      .update(jobCards)
      .set({
        internalStatus: toStatus,
        customerStatus,
        statusVersion: sql`${jobCards.statusVersion} + 1`,
        completedAt:
          toStatus === 'completed'
            ? now
            : fromStatus === 'completed'
              ? null
              : job.completedAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(jobCards.id, jobCardId),
          eq(jobCards.tenantId, tenantId),
          eq(jobCards.internalStatus, fromStatus),
          eq(jobCards.statusVersion, input.expectedStatusVersion),
        ),
      )
      .returning();

    if (!updatedJobCard) {
      throw new JobStatusConflictError(
        'The job card changed. Refresh it before trying again.',
      );
    }

    const [statusEvent] = await tx
      .insert(jobStatusEvents)
      .values({
        tenantId,
        jobCardId,
        fromStatus,
        toStatus,
        statusType: 'internal',
        note: input.reason ?? null,
        actorIdentity,
        createdAt: now,
      })
      .returning();

    const previousCustomerStatus = job.customerStatus as JobCustomerStatus;

    if (previousCustomerStatus !== customerStatus) {
      await tx.insert(jobStatusEvents).values({
        tenantId,
        jobCardId,
        fromStatus: previousCustomerStatus,
        toStatus: customerStatus,
        statusType: 'customer',
        note: null,
        actorIdentity,
        createdAt: now,
      });
    }

    return { jobCard: updatedJobCard, statusEvent };
  });
}

export async function getJobCardStatus(tenantId: string, jobCardId: string) {
  await requireTenantPermission(tenantId, 'jobs.read');

  const [job] = await db
    .select({
      id: jobCards.id,
      internalStatus: jobCards.internalStatus,
      customerStatus: jobCards.customerStatus,
      statusVersion: jobCards.statusVersion,
      updatedAt: jobCards.updatedAt,
    })
    .from(jobCards)
    .where(and(eq(jobCards.id, jobCardId), eq(jobCards.tenantId, tenantId)))
    .limit(1);

  if (!job) {
    throw new JobCardNotFoundError();
  }

  return job;
}

export async function getStationJobStatusTimeline(
  tenantId: string,
  jobCardId: string,
) {
  await requireTenantPermission(tenantId, 'jobs.read');

  const [job] = await db
    .select({ id: jobCards.id })
    .from(jobCards)
    .where(and(eq(jobCards.id, jobCardId), eq(jobCards.tenantId, tenantId)))
    .limit(1);

  if (!job) {
    throw new JobCardNotFoundError();
  }

  return db
    .select({
      id: jobStatusEvents.id,
      fromStatus: jobStatusEvents.fromStatus,
      toStatus: jobStatusEvents.toStatus,
      note: jobStatusEvents.note,
      actorIdentity: jobStatusEvents.actorIdentity,
      createdAt: jobStatusEvents.createdAt,
    })
    .from(jobStatusEvents)
    .where(
      and(
        eq(jobStatusEvents.tenantId, tenantId),
        eq(jobStatusEvents.jobCardId, jobCardId),
        eq(jobStatusEvents.statusType, 'internal'),
      ),
    )
    .orderBy(desc(jobStatusEvents.createdAt), desc(jobStatusEvents.id));
}

export async function getCustomerJobStatusTimeline(
  tenantId: string,
  jobCardId: string,
) {
  const user = await requireUser();
  const isDatabaseUserId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      user.id,
    );
  let customerId: string | null = null;

  if (isDatabaseUserId) {
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(
        and(
          eq(customers.tenantId, tenantId),
          eq(customers.userId, user.id),
          eq(customers.isArchived, false),
        ),
      )
      .limit(1);

    customerId = customer?.id ?? null;
  } else {
    const [membership] = await db
      .select({ email: tenantMembers.email })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, user.id),
          eq(tenantMembers.role, 'customer'),
          eq(tenantMembers.status, 'active'),
        ),
      )
      .limit(1);

    if (membership) {
      const matchingCustomers = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, tenantId),
            eq(customers.email, membership.email),
            eq(customers.isArchived, false),
          ),
        )
        .limit(2);

      if (matchingCustomers.length === 1) {
        customerId = matchingCustomers[0].id;
      }
    }
  }

  if (!customerId) {
    throw new JobCardNotFoundError();
  }

  const [job] = await db
    .select({ id: jobCards.id })
    .from(jobCards)
    .innerJoin(
      customers,
      and(
        eq(customers.id, jobCards.customerId),
        eq(customers.tenantId, jobCards.tenantId),
      ),
    )
    .where(
      and(
        eq(jobCards.id, jobCardId),
        eq(jobCards.tenantId, tenantId),
        eq(jobCards.customerId, customerId),
      ),
    )
    .limit(1);

  if (!job) {
    throw new JobCardNotFoundError();
  }

  const events = await db
    .select({
      id: jobStatusEvents.id,
      fromStatus: jobStatusEvents.fromStatus,
      toStatus: jobStatusEvents.toStatus,
      createdAt: jobStatusEvents.createdAt,
    })
    .from(jobStatusEvents)
    .where(
      and(
        eq(jobStatusEvents.tenantId, tenantId),
        eq(jobStatusEvents.jobCardId, jobCardId),
        eq(jobStatusEvents.statusType, 'customer'),
      ),
    )
    .orderBy(desc(jobStatusEvents.createdAt), desc(jobStatusEvents.id));

  return events.map((event) => ({
    id: event.id,
    fromStatus:
      event.fromStatus === null ? null : toCustomerStatus(event.fromStatus),
    toStatus: toCustomerStatus(event.toStatus),
    createdAt: event.createdAt.toISOString(),
  }));
}

function toCustomerStatus(status: string): JobCustomerStatus {
  if (!customerStatuses.has(status)) {
    throw new Error('Invalid customer status in job timeline.');
  }

  return status as JobCustomerStatus;
}
