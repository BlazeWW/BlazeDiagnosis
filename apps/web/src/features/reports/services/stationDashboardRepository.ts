import {
  and,
  asc,
  count,
  eq,
  inArray,
  notInArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from '@/db/schema';
import { customers } from '@/db/schema/customers';
import { invoices } from '@/db/schema/invoices';
import { jobCards } from '@/db/schema/jobs';
import { partsRequests } from '@/db/schema/suppliers';
import { vehicles } from '@/db/schema/vehicles';

// Database queries for the station dashboard (BD-008).
// Every query filters on the tenant id passed in by the service (which takes
// it from requireTenantContext), so one workshop's counts can never include
// another workshop's records. Joined tables are tenant-checked as well.

export type StationDashboardDatabase = NodePgDatabase<typeof schema>;

export const CLOSED_JOB_STATUSES = ['completed', 'cancelled'] as const;
export const OUTSTANDING_INVOICE_STATUSES = [
  'issued',
  'partially_paid',
  'overdue',
] as const;
export const OPEN_PARTS_REQUEST_STATUSES = [
  'sent',
  'response_received',
] as const;

const isOpenJob = notInArray(jobCards.internalStatus, [...CLOSED_JOB_STATUSES]);

// Counts the rows matching a condition inside a single aggregate query.
function countWhere(condition: SQL | undefined) {
  return sql<number>`count(*) filter (where ${condition})`.mapWith(Number);
}

export function createStationDashboardQueries(
  database: StationDashboardDatabase,
) {
  return {
    // One pass over the tenant's job cards for all three job counts.
    jobCounts(tenantId: string) {
      return database
        .select({
          awaitingApproval: countWhere(
            eq(jobCards.internalStatus, 'awaiting_customer_approval'),
          ),
          awaitingParts: countWhere(
            eq(jobCards.internalStatus, 'awaiting_parts'),
          ),
          openJobs: countWhere(isOpenJob),
        })
        .from(jobCards)
        .where(eq(jobCards.tenantId, tenantId));
    },

    outstandingInvoices(tenantId: string) {
      return database
        .select({
          count: count(),
          total: sql<string>`round(coalesce(sum(${invoices.total}), 0), 2)::text`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            inArray(invoices.status, [...OUTSTANDING_INVOICE_STATUSES]),
          ),
        );
    },

    // Open jobs, the ones due soonest (or overdue) first.
    attentionJobs(tenantId: string, limit: number) {
      return database
        .select({
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
          expectedCompletionAt: jobCards.expectedCompletionAt,
          id: jobCards.id,
          internalStatus: jobCards.internalStatus,
          jobNumber: jobCards.jobNumber,
          priority: jobCards.priority,
          vehicleMake: vehicles.make,
          vehicleModel: vehicles.model,
          vehicleRegistrationNumber: vehicles.registrationNumber,
        })
        .from(jobCards)
        .innerJoin(
          vehicles,
          and(
            eq(vehicles.id, jobCards.vehicleId),
            eq(vehicles.tenantId, tenantId),
          ),
        )
        .innerJoin(
          customers,
          and(
            eq(customers.id, jobCards.customerId),
            eq(customers.tenantId, tenantId),
          ),
        )
        .where(and(eq(jobCards.tenantId, tenantId), isOpenJob))
        .orderBy(
          sql`${jobCards.expectedCompletionAt} asc nulls last`,
          asc(jobCards.createdAt),
        )
        .limit(limit);
    },

    // Parts requests still waiting on a supplier, oldest first.
    partsQueue(tenantId: string, limit: number) {
      return database
        .select({
          id: partsRequests.id,
          jobNumber: jobCards.jobNumber,
          requestedAt: partsRequests.createdAt,
          status: partsRequests.status,
        })
        .from(partsRequests)
        .innerJoin(
          jobCards,
          and(
            eq(jobCards.id, partsRequests.jobCardId),
            eq(jobCards.tenantId, tenantId),
          ),
        )
        .where(
          and(
            eq(partsRequests.tenantId, tenantId),
            inArray(partsRequests.status, [...OPEN_PARTS_REQUEST_STATUSES]),
          ),
        )
        .orderBy(asc(partsRequests.createdAt))
        .limit(limit);
    },
  };
}

export type StationDashboardQueries = ReturnType<
  typeof createStationDashboardQueries
>;
