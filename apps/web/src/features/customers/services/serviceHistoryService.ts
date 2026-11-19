import { z } from 'zod';

import { db } from '@/db/client';
import { requireUser } from '@/lib/auth/session';
import { TenantAccessError } from '@/lib/authorization/guards';
import type { CustomerServiceHistoryPage } from '@/types/serviceHistory';

import {
  createServiceHistoryQueries,
  type ServiceHistoryQueries,
} from './serviceHistoryRepository';
import { toCustomerServiceHistoryItem } from './serviceHistorySerializer';

// Customer service history (BD-037).
// A customer sees only jobs where they are the job card's customer, inside the
// tenant of their session. The customer record is found from the signed-in
// user (customers.user_id), never from a client-supplied id.

export const SERVICE_HISTORY_MAX_PAGE_SIZE = 50;

export const serviceHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(SERVICE_HISTORY_MAX_PAGE_SIZE)
    .default(10),
});

export type ServiceHistoryQueryInput = z.input<
  typeof serviceHistoryQuerySchema
>;

export class CustomerProfileNotFoundError extends Error {
  constructor(message = 'No customer profile is linked to this account.') {
    super(message);
    this.name = 'CustomerProfileNotFoundError';
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCustomerServiceHistory(
  input: ServiceHistoryQueryInput = {},
  queries: ServiceHistoryQueries = createServiceHistoryQueries(db),
): Promise<CustomerServiceHistoryPage> {
  const { page, pageSize } = serviceHistoryQuerySchema.parse(input);
  const user = await requireUser();
  const tenantId = user.activeTenantId;

  if (!tenantId) {
    throw new TenantAccessError();
  }

  // customers.user_id is a UUID; identities that are not UUIDs cannot be linked.
  if (!uuidPattern.test(user.id)) {
    throw new CustomerProfileNotFoundError();
  }

  const [customer] = await queries.findLinkedCustomer(tenantId, user.id);

  if (!customer) {
    throw new CustomerProfileNotFoundError();
  }

  const scope = { customerId: customer.id, tenantId };
  const [countResult, jobs] = await Promise.all([
    queries.countJobs(scope),
    queries.listJobs(scope, { limit: pageSize, offset: (page - 1) * pageSize }),
  ]);
  const total = Number(countResult[0]?.total ?? 0);

  const jobCardIds = jobs.map((job) => job.jobCardId);
  const [quoteRows, invoiceRows, noteRows] =
    jobCardIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          queries.listQuotes(scope, jobCardIds),
          queries.listInvoices(scope, jobCardIds),
          queries.listCustomerNotes(scope, jobCardIds),
        ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    items: jobs.map((job) =>
      toCustomerServiceHistoryItem(job, {
        invoices: invoiceRows,
        notes: noteRows,
        quotes: quoteRows,
      }),
    ),
    pagination: {
      hasNextPage: page < totalPages,
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}
