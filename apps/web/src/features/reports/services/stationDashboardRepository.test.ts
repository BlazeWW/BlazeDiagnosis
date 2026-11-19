import { drizzle } from 'drizzle-orm/node-postgres';
import { describe, expect, it } from 'vitest';

import * as schema from '@/db/schema';

import { createStationDashboardQueries } from './stationDashboardRepository';

// Builds the SQL without a database to prove every query is tenant-scoped.
const queries = createStationDashboardQueries(drizzle.mock({ schema }));

describe('stationDashboardRepository', () => {
  it('counts jobs for one tenant only, in a single query', () => {
    const query = queries.jobCounts('tenant-a').toSQL();

    expect(query.sql).toMatch(/where "job_cards"."tenant_id" = \$\d+$/);
    expect(query.sql).toMatch(
      /count\(\*\) filter \(where "job_cards"."internal_status" = \$\d+\)/,
    );
    expect(query.sql).toMatch(
      /"job_cards"."internal_status" not in \(\$\d+, \$\d+\)/,
    );
    expect(query.params).toEqual(
      expect.arrayContaining([
        'tenant-a',
        'awaiting_customer_approval',
        'awaiting_parts',
        'completed',
        'cancelled',
      ]),
    );
  });

  it('sums only outstanding invoices for the tenant', () => {
    const query = queries.outstandingInvoices('tenant-a').toSQL();

    expect(query.sql).toMatch(/"invoices"."tenant_id" = \$1/);
    expect(query.sql).toMatch(/"invoices"."status" in \(\$2, \$3, \$4\)/);
    expect(query.params).toEqual([
      'tenant-a',
      'issued',
      'partially_paid',
      'overdue',
    ]);
  });

  it('lists open jobs with tenant-scoped joins, soonest due first', () => {
    const query = queries.attentionJobs('tenant-a', 5).toSQL();

    expect(query.sql).toMatch(/"vehicles"."tenant_id" = \$\d+/);
    expect(query.sql).toMatch(/"customers"."tenant_id" = \$\d+/);
    expect(query.sql).toMatch(/"job_cards"."tenant_id" = \$\d+/);
    expect(query.sql).toMatch(
      /order by "job_cards"."expected_completion_at" asc nulls last/,
    );
    expect(query.params.filter((param) => param === 'tenant-a')).toHaveLength(
      3,
    );
    expect(query.params.at(-1)).toBe(5);
  });

  it('lists only open parts requests for the tenant', () => {
    const query = queries.partsQueue('tenant-a', 5).toSQL();

    expect(query.sql).toMatch(/"parts_requests"."tenant_id" = \$\d+/);
    expect(query.sql).toMatch(/"job_cards"."tenant_id" = \$\d+/);
    expect(query.params).toEqual(
      expect.arrayContaining(['tenant-a', 'sent', 'response_received', 5]),
    );
    expect(query.params).not.toContain('draft');
  });
});
