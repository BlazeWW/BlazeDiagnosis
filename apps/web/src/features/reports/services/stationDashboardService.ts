import { db } from '@/db/client';
import { requireTenantPermission } from '@/lib/authorization/guards';
import type { Permission } from '@/lib/constants/roles';
import { requireTenantContext } from '@/lib/tenancy/tenantContext';
import type { StationDashboard } from '@/types/stationDashboard';

import {
  createStationDashboardQueries,
  type StationDashboardQueries,
} from './stationDashboardRepository';

// Station dashboard (BD-008): live, tenant-scoped workshop metrics.
// The tenant comes from requireTenantContext (session tenant first), never
// from a query parameter or request body.
// Figures are a point-in-time snapshot of current state (no date range).

export const ATTENTION_QUEUE_LIMIT = 5;

// Roles that may see money figures on the dashboard.
const FINANCIAL_PERMISSIONS: readonly Permission[] = [
  'invoices.create',
  'invoices.update',
  'reports.view',
];

export async function getStationDashboard(
  options: { now?: Date } = {},
  queries: StationDashboardQueries = createStationDashboardQueries(db),
): Promise<StationDashboard> {
  const now = options.now ?? new Date();
  const { tenantId } = await requireTenantContext();
  const user = await requireTenantPermission(tenantId, 'jobs.read');
  const canSeeFinancials = FINANCIAL_PERMISSIONS.some((permission) =>
    user.permissions.includes(permission),
  );

  const [jobCounts, invoiceTotals, attentionJobs, partsQueue] =
    await Promise.all([
      queries.jobCounts(tenantId),
      canSeeFinancials
        ? queries.outstandingInvoices(tenantId)
        : Promise.resolve(null),
      queries.attentionJobs(tenantId, ATTENTION_QUEUE_LIMIT),
      queries.partsQueue(tenantId, ATTENTION_QUEUE_LIMIT),
    ]);

  const counts = jobCounts[0];
  const invoices = invoiceTotals?.[0];

  return {
    attentionJobs: attentionJobs.map((job) => ({
      customerName: `${job.customerFirstName} ${job.customerLastName}`,
      expectedCompletionAt: job.expectedCompletionAt?.toISOString() ?? null,
      id: job.id,
      internalStatus: job.internalStatus,
      isOverdue:
        job.expectedCompletionAt !== null && job.expectedCompletionAt < now,
      jobNumber: job.jobNumber,
      priority: job.priority,
      vehicle: [
        job.vehicleMake,
        job.vehicleModel,
        job.vehicleRegistrationNumber,
      ]
        .filter(Boolean)
        .join(' '),
    })),
    generatedAt: now.toISOString(),
    metrics: {
      awaitingApproval: counts?.awaitingApproval ?? 0,
      awaitingParts: counts?.awaitingParts ?? 0,
      openJobs: counts?.openJobs ?? 0,
      outstandingInvoices: canSeeFinancials
        ? { count: invoices?.count ?? 0, total: invoices?.total ?? '0.00' }
        : null,
    },
    partsQueue: partsQueue.map((request) => ({
      id: request.id,
      jobNumber: request.jobNumber,
      requestedAt: request.requestedAt.toISOString(),
      status: request.status,
    })),
  };
}
