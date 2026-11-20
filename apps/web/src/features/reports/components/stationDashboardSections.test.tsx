import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMock = vi.hoisted(() => ({ getStationDashboard: vi.fn() }));

vi.mock(
  '@/features/reports/services/stationDashboardService',
  () => serviceMock,
);

import { TenantAccessError } from '@/lib/authorization/guards';
import type { StationDashboard } from '@/types/stationDashboard';

import {
  StationDashboardSections,
  StationDashboardSkeleton,
  StationDashboardView,
} from './stationDashboardSections';

const emptyDashboard: StationDashboard = {
  attentionJobs: [],
  generatedAt: '2026-11-18T10:00:00.000Z',
  metrics: {
    awaitingApproval: 0,
    awaitingParts: 0,
    openJobs: 0,
    outstandingInvoices: { count: 0, total: '0.00' },
  },
  partsQueue: [],
};

describe('StationDashboardView', () => {
  it('shows zeros and empty messages for an empty tenant', () => {
    const html = renderToStaticMarkup(
      <StationDashboardView dashboard={emptyDashboard} locale="en" />,
    );

    // Three job counts show 0 and the invoice total shows R 0,00.
    expect(html.match(/>0<\/p>/g)).toHaveLength(3);
    expect(html).toMatch(/R\s0,00/);
    expect(html).toContain('0 issued, part-paid or overdue');
    expect(html).toContain('No open jobs');
    expect(html).toContain('No parts blockers');
  });

  it('hides money when the role has no financial access', () => {
    const html = renderToStaticMarkup(
      <StationDashboardView
        dashboard={{
          ...emptyDashboard,
          metrics: { ...emptyDashboard.metrics, outstandingInvoices: null },
        }}
        locale="en"
      />,
    );

    expect(html).toContain('Not available for your role');
  });

  it('marks overdue jobs', () => {
    const html = renderToStaticMarkup(
      <StationDashboardView
        dashboard={{
          ...emptyDashboard,
          attentionJobs: [
            {
              customerName: 'Test Customer',
              expectedCompletionAt: '2026-11-17T08:00:00.000Z',
              id: 'job-1',
              internalStatus: 'awaiting_parts',
              isOverdue: true,
              jobNumber: 'JOB-1',
              priority: 'urgent',
              vehicle: 'VW Polo',
            },
          ],
        }}
        locale="en"
      />,
    );

    expect(html).toContain('JOB-1');
    expect(html).toContain('Overdue');
    expect(html).toContain('/en/station/job-cards');
  });

  it('shows dates in South African time, whatever the server timezone', () => {
    // 23:30 UTC on 17 Nov is 01:30 on 18 Nov in Johannesburg.
    const html = renderToStaticMarkup(
      <StationDashboardView
        dashboard={{
          ...emptyDashboard,
          generatedAt: '2026-11-17T23:30:00.000Z',
          partsQueue: [
            {
              id: 'parts-1',
              jobNumber: 'JOB-2',
              requestedAt: '2026-11-17T23:30:00.000Z',
              status: 'sent',
            },
          ],
        }}
        locale="en"
      />,
    );

    expect(html).toMatch(/Live figures as of 18 Nov 2026/);
    expect(html).toMatch(/Requested 18 Nov 2026/);
    expect(html).toContain('Sent to suppliers, waiting for a response.');
  });
});

describe('StationDashboardSkeleton', () => {
  it('announces loading to screen readers', () => {
    const html = renderToStaticMarkup(<StationDashboardSkeleton />);

    expect(html).toContain('role="status"');
    expect(html).toContain('Loading dashboard');
  });
});

describe('StationDashboardSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('shows an access message when the role is denied', async () => {
    serviceMock.getStationDashboard.mockRejectedValue(new TenantAccessError());

    const html = renderToStaticMarkup(
      await StationDashboardSections({ locale: 'en' }),
    );

    expect(html).toContain('Dashboard not available');
  });

  it('shows an error message instead of crashing when loading fails', async () => {
    serviceMock.getStationDashboard.mockRejectedValue(
      new Error('connection refused'),
    );

    const html = renderToStaticMarkup(
      await StationDashboardSections({ locale: 'en' }),
    );

    expect(html).toContain('Dashboard data unavailable');
    expect(html).not.toContain('connection refused');
  });
});
