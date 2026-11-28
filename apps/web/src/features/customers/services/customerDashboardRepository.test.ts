import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';

import * as schema from '@/db/schema';

import { createCustomerDashboardQueries } from './customerDashboardRepository';

// Builds the SQL without a database connection.
const queries = createCustomerDashboardQueries(drizzle.mock({ schema }));
const scope = { customerId: 'customer-a', tenantId: 'tenant-a' };

describe('customerDashboardRepository', () => {
  it('scopes vehicles to tenant, owner and non-archived', () => {
    const query = queries.listVehicles(scope, 3).toSQL();

    expect(query.sql).toMatch(/"vehicles"."tenant_id" = \$1/);
    expect(query.sql).toMatch(/"vehicles"."primary_customer_id" = \$2/);
    expect(query.sql).toMatch(/"vehicles"."is_archived" = \$3/);
    expect(query.params).toEqual(['tenant-a', 'customer-a', false, 3]);
  });

  it('counts vehicles with the same scope', () => {
    const query = queries.countVehicles(scope).toSQL();

    expect(query.params).toEqual(['tenant-a', 'customer-a', false]);
  });

  it('scopes open quotes to tenant and customer and never includes drafts', () => {
    const query = queries.listOpenQuotes(scope, 3).toSQL();

    expect(query.sql).toMatch(/"quotes"."tenant_id" = \$1 and "quotes"."customer_id" = \$2/);
    expect(query.params).toEqual(
      expect.arrayContaining(['tenant-a', 'customer-a', 'sent', 'partially_approved']),
    );
    expect(query.params).not.toContain('draft');
    expect(query.params).not.toContain('declined');
  });

  it('scopes open invoices to tenant and customer and never includes drafts or paid', () => {
    const query = queries.listOpenInvoices(scope, 3).toSQL();

    expect(query.sql).toMatch(
      /"invoices"."tenant_id" = \$1 and "invoices"."customer_id" = \$2/,
    );
    expect(query.params).toEqual(
      expect.arrayContaining(['tenant-a', 'customer-a', 'issued', 'partially_paid', 'overdue']),
    );
    expect(query.params).not.toContain('draft');
    expect(query.params).not.toContain('paid');
  });

  it('scopes pending requests to tenant and customer', () => {
    const query = queries.listPendingRequests(scope, 3).toSQL();

    expect(query.sql).toMatch(
      /"service_requests"."tenant_id" = \$1 and "service_requests"."customer_id" = \$2/,
    );
    expect(query.params).toEqual(
      expect.arrayContaining(['tenant-a', 'customer-a', 'received']),
    );
  });

  it('never selects internal or cost fields', () => {
    for (const query of [
      queries.listVehicles(scope, 3),
      queries.listOpenQuotes(scope, 3),
      queries.listOpenInvoices(scope, 3),
      queries.listPendingRequests(scope, 3),
    ]) {
      const { sql } = query.toSQL();
      const selected = sql.slice(0, sql.indexOf(' from '));

      expect(selected).not.toMatch(/notes|customer_concern|vin|amount_paid|tax_total|subtotal/);
    }
  });
});