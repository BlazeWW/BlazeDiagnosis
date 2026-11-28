import { db } from '@/db/client';
import { requireUser } from '@/lib/auth/session';
import { TenantAccessError } from '@/lib/authorization/guards';
import type { CustomerDashboard } from '@/types/customerDashboard';

import {
  createCustomerDashboardQueries,
  type CustomerDashboardQueries,
} from './customerDashboardRepository';
import { CustomerProfileNotFoundError } from './serviceHistoryService';

// Customer dashboard (BD-036). Same identity rules as service history (BD-037):
// the customer is found from the signed-in user, never from a client-supplied id.

export const DASHBOARD_PREVIEW_LIMIT = 3;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const iso = (value: Date | null) => (value ? value.toISOString() : null);
const toTotal = (rows: { total: number | string }[]) => Number(rows[0]?.total ?? 0);

export async function getCustomerDashboard(
  queries: CustomerDashboardQueries = createCustomerDashboardQueries(db),
): Promise<CustomerDashboard> {
  const user = await requireUser();
  const tenantId = user.activeTenantId;

  if (!tenantId) {
    throw new TenantAccessError();
  }

  if (!uuidPattern.test(user.id)) {
    throw new CustomerProfileNotFoundError();
  }

  const [customer] = await queries.findLinkedCustomer(tenantId, user.id);

  if (!customer) {
    throw new CustomerProfileNotFoundError();
  }

  const scope = { customerId: customer.id, tenantId };
  const limit = DASHBOARD_PREVIEW_LIMIT;
  const [
    vehicleTotal,
    vehicleItems,
    quoteTotal,
    quoteItems,
    invoiceTotal,
    invoiceItems,
    requestTotal,
    requestItems,
  ] = await Promise.all([
    queries.countVehicles(scope),
    queries.listVehicles(scope, limit),
    queries.countOpenQuotes(scope),
    queries.listOpenQuotes(scope, limit),
    queries.countOpenInvoices(scope),
    queries.listOpenInvoices(scope, limit),
    queries.countPendingRequests(scope),
    queries.listPendingRequests(scope, limit),
  ]);

  return {
    openInvoices: {
      items: invoiceItems.map((row) => ({ ...row, dueAt: iso(row.dueAt) })),
      total: toTotal(invoiceTotal),
    },
    openQuotes: {
      items: quoteItems.map((row) => ({ ...row, sentAt: iso(row.sentAt) })),
      total: toTotal(quoteTotal),
    },
    pendingRequests: {
      items: requestItems.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      total: toTotal(requestTotal),
    },
    vehicles: { items: vehicleItems, total: toTotal(vehicleTotal) },
  };
}