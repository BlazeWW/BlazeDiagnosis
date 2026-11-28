import { and, count, desc, eq, inArray } from 'drizzle-orm';

import { invoices } from '@/db/schema/invoices';
import { serviceRequests } from '@/db/schema/jobs';
import { quotes } from '@/db/schema/quotes';
import { vehicles } from '@/db/schema/vehicles';

import {
  createServiceHistoryQueries,
  type CustomerHistoryScope,
  type ServiceHistoryDatabase,
} from './serviceHistoryRepository';

// Subsets of the BD-037 customer-visible statuses: documents still waiting on the customer.
// Drafts are never included.
export const openQuoteStatuses = ['sent', 'partially_approved'] as const;
export const openInvoiceStatuses = ['issued', 'partially_paid', 'overdue'] as const;
// A request is "pending" until staff convert it to a job card.
export const pendingRequestStatuses = ['received'] as const;

// Every query is scoped to the session tenant and the customer linked to the
// signed-in user. Neither value ever comes from the client.
export function createCustomerDashboardQueries(database: ServiceHistoryDatabase) {
  const { findLinkedCustomer } = createServiceHistoryQueries(database);

  const vehicleWhere = (s: CustomerHistoryScope) =>
    and(
      eq(vehicles.tenantId, s.tenantId),
      eq(vehicles.primaryCustomerId, s.customerId),
      eq(vehicles.isArchived, false),
    );
  const quoteWhere = (s: CustomerHistoryScope) =>
    and(
      eq(quotes.tenantId, s.tenantId),
      eq(quotes.customerId, s.customerId),
      inArray(quotes.status, [...openQuoteStatuses]),
    );
  const invoiceWhere = (s: CustomerHistoryScope) =>
    and(
      eq(invoices.tenantId, s.tenantId),
      eq(invoices.customerId, s.customerId),
      inArray(invoices.status, [...openInvoiceStatuses]),
    );
  const requestWhere = (s: CustomerHistoryScope) =>
    and(
      eq(serviceRequests.tenantId, s.tenantId),
      eq(serviceRequests.customerId, s.customerId),
      inArray(serviceRequests.status, [...pendingRequestStatuses]),
    );

  return {
    findLinkedCustomer,

    countVehicles: (s: CustomerHistoryScope) =>
      database.select({ total: count() }).from(vehicles).where(vehicleWhere(s)),
    listVehicles: (s: CustomerHistoryScope, limit: number) =>
      database
        .select({
          id: vehicles.id,
          make: vehicles.make,
          model: vehicles.model,
          registrationNumber: vehicles.registrationNumber,
          year: vehicles.year,
        })
        .from(vehicles)
        .where(vehicleWhere(s))
        .orderBy(desc(vehicles.createdAt))
        .limit(limit),

    countOpenQuotes: (s: CustomerHistoryScope) =>
      database.select({ total: count() }).from(quotes).where(quoteWhere(s)),
    listOpenQuotes: (s: CustomerHistoryScope, limit: number) =>
      database
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          sentAt: quotes.sentAt,
          status: quotes.status,
          total: quotes.total,
        })
        .from(quotes)
        .where(quoteWhere(s))
        .orderBy(desc(quotes.createdAt))
        .limit(limit),

    countOpenInvoices: (s: CustomerHistoryScope) =>
      database.select({ total: count() }).from(invoices).where(invoiceWhere(s)),
    listOpenInvoices: (s: CustomerHistoryScope, limit: number) =>
      database
        .select({
          id: invoices.id,
          dueAt: invoices.dueAt,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          total: invoices.total,
        })
        .from(invoices)
        .where(invoiceWhere(s))
        .orderBy(desc(invoices.createdAt))
        .limit(limit),

    countPendingRequests: (s: CustomerHistoryScope) =>
      database
        .select({ total: count() })
        .from(serviceRequests)
        .where(requestWhere(s)),
    listPendingRequests: (s: CustomerHistoryScope, limit: number) =>
      database
        .select({
          id: serviceRequests.id,
          createdAt: serviceRequests.createdAt,
          requestedService: serviceRequests.requestedService,
        })
        .from(serviceRequests)
        .where(requestWhere(s))
        .orderBy(desc(serviceRequests.createdAt))
        .limit(limit),
  };
}

export type CustomerDashboardQueries = ReturnType<
  typeof createCustomerDashboardQueries
>;