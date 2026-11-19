import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as schema from '@/db/schema';
import { customers } from '@/db/schema/customers';
import { invoices } from '@/db/schema/invoices';
import { jobCards, jobNotes } from '@/db/schema/jobs';
import { quotes } from '@/db/schema/quotes';
import { vehicles } from '@/db/schema/vehicles';

import {
  customerVisibleInvoiceStatuses,
  customerVisibleQuoteStatuses,
} from './serviceHistorySerializer';

// Database queries for customer service history (BD-037).
// Every query is scoped to the tenant from the session and to the customer
// record linked to the signed-in user. Neither value ever comes from the client.

export type ServiceHistoryDatabase = NodePgDatabase<typeof schema>;

export type CustomerHistoryScope = {
  customerId: string;
  tenantId: string;
};

function customerJobsCondition(scope: CustomerHistoryScope) {
  return and(
    eq(jobCards.tenantId, scope.tenantId),
    eq(jobCards.customerId, scope.customerId),
    ne(jobCards.internalStatus, 'cancelled'),
  );
}

export function createServiceHistoryQueries(database: ServiceHistoryDatabase) {
  return {
    findLinkedCustomer(tenantId: string, userId: string) {
      return database
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, tenantId),
            eq(customers.userId, userId),
            eq(customers.isArchived, false),
          ),
        )
        .limit(1);
    },

    countJobs(scope: CustomerHistoryScope) {
      return database
        .select({ total: count() })
        .from(jobCards)
        .where(customerJobsCondition(scope));
    },

    listJobs(
      scope: CustomerHistoryScope,
      pageOptions: { limit: number; offset: number },
    ) {
      return database
        .select({
          completedAt: jobCards.completedAt,
          createdAt: jobCards.createdAt,
          customerStatus: jobCards.customerStatus,
          expectedCompletionAt: jobCards.expectedCompletionAt,
          jobCardId: jobCards.id,
          jobNumber: jobCards.jobNumber,
          vehicleMake: vehicles.make,
          vehicleModel: vehicles.model,
          vehicleRegistrationNumber: vehicles.registrationNumber,
          vehicleYear: vehicles.year,
        })
        .from(jobCards)
        .innerJoin(
          vehicles,
          and(
            eq(vehicles.id, jobCards.vehicleId),
            eq(vehicles.tenantId, scope.tenantId),
          ),
        )
        .where(customerJobsCondition(scope))
        .orderBy(desc(jobCards.createdAt), desc(jobCards.id))
        .limit(pageOptions.limit)
        .offset(pageOptions.offset);
    },

    listQuotes(scope: CustomerHistoryScope, jobCardIds: string[]) {
      return database
        .select({
          id: quotes.id,
          jobCardId: quotes.jobCardId,
          quoteNumber: quotes.quoteNumber,
          sentAt: quotes.sentAt,
          status: quotes.status,
          total: quotes.total,
        })
        .from(quotes)
        .where(
          and(
            eq(quotes.tenantId, scope.tenantId),
            eq(quotes.customerId, scope.customerId),
            inArray(quotes.jobCardId, jobCardIds),
            inArray(quotes.status, [...customerVisibleQuoteStatuses]),
          ),
        )
        .orderBy(asc(quotes.createdAt));
    },

    listInvoices(scope: CustomerHistoryScope, jobCardIds: string[]) {
      return database
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          issuedAt: invoices.issuedAt,
          jobCardId: invoices.jobCardId,
          status: invoices.status,
          total: invoices.total,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, scope.tenantId),
            eq(invoices.customerId, scope.customerId),
            inArray(invoices.jobCardId, jobCardIds),
            inArray(invoices.status, [...customerVisibleInvoiceStatuses]),
          ),
        )
        .orderBy(asc(invoices.createdAt));
    },

    // jobCardIds always come from listJobs, which is already customer-scoped.
    listCustomerNotes(scope: CustomerHistoryScope, jobCardIds: string[]) {
      return database
        .select({
          body: jobNotes.body,
          createdAt: jobNotes.createdAt,
          jobCardId: jobNotes.jobCardId,
          visibility: jobNotes.visibility,
        })
        .from(jobNotes)
        .where(
          and(
            eq(jobNotes.tenantId, scope.tenantId),
            inArray(jobNotes.jobCardId, jobCardIds),
            eq(jobNotes.visibility, 'customer'),
          ),
        )
        .orderBy(asc(jobNotes.createdAt));
    },
  };
}

export type ServiceHistoryQueries = ReturnType<
  typeof createServiceHistoryQueries
>;
