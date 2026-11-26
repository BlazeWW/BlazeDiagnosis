import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({
  fetchJobCards: vi.fn(),
  fetchServiceRequests: vi.fn(),
}));

import type { JobCardRecord, ServiceRequestRecord } from '@/types/jobCards';

import {
  computeJobCardMetrics,
  JobCardOverviewView,
  toServiceRequestRecords,
} from './jobCardOverview';

const job = (
  id: string,
  internalStatus: string,
  assignedMechanicId: string | null = null,
): JobCardRecord => ({
  assignedFloorManagerId: null,
  assignedMechanicId,
  id,
  internalStatus,
  jobNumber: `JC-${id}`,
});

const request: ServiceRequestRecord = {
  createdAt: '2026-11-18T10:00:00.000Z',
  customerConcern: 'Squeaking when braking',
  customerId: '11111111-1111-4111-8111-111111111111',
  id: '77777777-7777-4777-8777-777777777777',
  preferredDate: '2026-11-25T00:00:00.000Z',
  requestedService: 'Brake inspection',
  status: 'received',
  updatedAt: '2026-11-18T10:00:00.000Z',
  vehicleId: '33333333-3333-4333-8333-333333333333',
};

describe('computeJobCardMetrics', () => {
  it('counts open, unassigned, blocked and QC jobs, ignoring closed jobs', () => {
    const metrics = computeJobCardMetrics([
      job('1', 'work_in_progress', 'mech-1'),
      job('2', 'awaiting_parts'),
      job('3', 'awaiting_customer_approval', 'mech-1'),
      job('4', 'quality_control', 'mech-2'),
      job('5', 'completed'),
      job('6', 'cancelled'),
    ]);

    expect(Object.fromEntries(metrics.map((m) => [m.label, m.value]))).toEqual({
      Blocked: '2',
      'Open jobs': '4',
      'Ready for QC': '1',
      Unassigned: '1',
    });
  });

  it('returns zeros for an empty tenant', () => {
    expect(computeJobCardMetrics([]).map((m) => m.value)).toEqual([
      '0',
      '0',
      '0',
      '0',
    ]);
  });
});

describe('toServiceRequestRecords', () => {
  it('maps a service request to a display record', () => {
    expect(toServiceRequestRecords([request])).toEqual([
      {
        description: 'Squeaking when braking',
        id: request.id,
        meta: 'Received 2026-11-18 · Preferred 2026-11-25',
        status: 'Received',
        statusTone: 'info',
        title: 'Brake inspection',
      },
    ]);
  });

  it('falls back when no concern or preferred date is recorded', () => {
    const [record] = toServiceRequestRecords([
      {
        ...request,
        customerConcern: undefined,
        preferredDate: undefined,
        status: 'converted',
      },
    ]);

    expect(record.description).toBe('No customer concern recorded.');
    expect(record.meta).toBe('Received 2026-11-18');
    expect(record.status).toBe('Converted to job card');
  });
});

describe('JobCardOverviewView', () => {
  const render = (props: Partial<Parameters<typeof JobCardOverviewView>[0]>) =>
    renderToStaticMarkup(
      <JobCardOverviewView
        error={null}
        jobCards={[]}
        loading={false}
        serviceRequests={[]}
        {...props}
      />,
    );

  it('shows a loading state', () => {
    expect(render({ loading: true })).toContain('Loading job cards');
  });

  it('shows the API error instead of stale demo data', () => {
    const html = render({ error: 'Failed to fetch service requests.' });
    expect(html).toContain('Failed to fetch service requests.');
    expect(html).not.toContain('JC-2026-0184');
  });

  it('shows an empty state when there are no service requests', () => {
    expect(render({})).toContain('No service requests yet');
  });

  it('renders live metrics and the service request queue', () => {
    const html = render({
      jobCards: [job('1', 'work_in_progress')],
      serviceRequests: [request],
    });

    expect(html).toContain('Brake inspection');
    expect(html).toContain('Squeaking when braking');
    expect(html).toContain('Service request queue');
    expect(html).toContain('Open jobs');
  });
});
