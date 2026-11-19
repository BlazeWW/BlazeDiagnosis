import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';

import * as schema from '@/db/schema';

import { createServiceHistoryQueries } from './serviceHistoryRepository';

// Builds the SQL without a database connection, to prove every query is
// scoped to the tenant and customer and filters out internal data.
const queries = createServiceHistoryQueries(drizzle.mock({ schema }));
const scope = { customerId: 'customer-a', tenantId: 'tenant-a' };

describe('serviceHistoryRepository', () => {
  it('finds the customer linked to the signed-in user inside the session tenant', () => {
    const query = queries.findLinkedCustomer('tenant-a', 'user-a').toSQL();

    expect(query.sql).toMatch(/"customers"."tenant_id" = \$1/);
    expect(query.sql).toMatch(/"customers"."user_id" = \$2/);
    expect(query.sql).toMatch(/"customers"."is_archived" = \$3/);
    expect(query.params).toEqual(['tenant-a', 'user-a', false, 1]);
  });

  it("lists only the customer's own non-cancelled jobs, newest first, with paging", () => {
    const query = queries.listJobs(scope, { limit: 10, offset: 20 }).toSQL();

    expect(query.sql).toMatch(/"job_cards"."tenant_id" = \$\d/);
    expect(query.sql).toMatch(/"job_cards"."customer_id" = \$\d/);
    expect(query.sql).toMatch(/"job_cards"."internal_status" <> \$\d/);
    expect(query.sql).toMatch(/"vehicles"."tenant_id" = \$\d/);
    expect(query.sql).toMatch(/order by "job_cards"."created_at" desc/);
    expect(query.params).toEqual(
      expect.arrayContaining(['tenant-a', 'customer-a', 'cancelled', 10, 20]),
    );
  });

  it('never selects internal job fields', () => {
    const { sql } = queries.listJobs(scope, { limit: 10, offset: 0 }).toSQL();
    const selectedColumns = sql.slice(0, sql.indexOf(' from '));

    expect(selectedColumns).not.toMatch(
      /internal_status|assigned_mechanic_id|assigned_floor_manager_id|priority/,
    );
  });

  it('counts with the same tenant and customer scope', () => {
    const query = queries.countJobs(scope).toSQL();

    expect(query.sql).toMatch(/"job_cards"."tenant_id" = \$1/);
    expect(query.sql).toMatch(/"job_cards"."customer_id" = \$2/);
    expect(query.params).toEqual(['tenant-a', 'customer-a', 'cancelled']);
  });

  it('scopes quotes and invoices to tenant and customer and excludes drafts', () => {
    const quoteQuery = queries.listQuotes(scope, ['job-1']).toSQL();
    const invoiceQuery = queries.listInvoices(scope, ['job-1']).toSQL();

    expect(quoteQuery.sql).toMatch(
      /"quotes"."tenant_id" = \$1 and "quotes"."customer_id" = \$2/,
    );
    expect(invoiceQuery.sql).toMatch(
      /"invoices"."tenant_id" = \$1 and "invoices"."customer_id" = \$2/,
    );
    expect(quoteQuery.params).not.toContain('draft');
    expect(invoiceQuery.params).not.toContain('draft');
    expect(quoteQuery.sql).not.toMatch(/line_items|cost/);
  });

  it('returns only customer-visible notes', () => {
    const query = queries.listCustomerNotes(scope, ['job-1']).toSQL();

    expect(query.sql).toMatch(/"job_notes"."tenant_id" = \$1/);
    expect(query.sql).toMatch(/"job_notes"."visibility" = \$3/);
    expect(query.params).toEqual(['tenant-a', 'job-1', 'customer']);
  });
});
