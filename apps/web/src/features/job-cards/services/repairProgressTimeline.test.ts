import { describe, expect, it } from 'vitest';

import {
  buildCustomerRepairTimeline,
  type CustomerStatusEventInput,
} from './repairProgressTimeline';

const PENDING_SEQUENCE_FIXTURE: readonly CustomerStatusEventInput[] = [
  {
    id: 'evt-1',
    fromStatus: null,
    toStatus: 'request_received',
    createdAt: '2026-11-26T08:00:00.000Z',
  },
  {
    id: 'evt-2',
    fromStatus: 'request_received',
    toStatus: 'vehicle_checked_in',
    createdAt: '2026-11-26T09:15:00.000Z',
  },
  {
    id: 'evt-3',
    fromStatus: 'vehicle_checked_in',
    toStatus: 'inspection_in_progress',
    createdAt: '2026-11-26T10:30:00.000Z',
  },
];

const DELAYED_SEQUENCE_FIXTURE: readonly CustomerStatusEventInput[] = [
  {
    id: 'evt-10',
    fromStatus: null,
    toStatus: 'request_received',
    createdAt: '2026-11-25T07:30:00.000Z',
  },
  {
    id: 'evt-11',
    fromStatus: 'request_received',
    toStatus: 'inspection_in_progress',
    createdAt: '2026-11-25T09:00:00.000Z',
  },
  {
    id: 'evt-12',
    fromStatus: 'inspection_in_progress',
    toStatus: 'waiting_for_parts',
    createdAt: '2026-11-25T11:45:00.000Z',
  },
];

const COMPLETED_SEQUENCE_FIXTURE: readonly CustomerStatusEventInput[] = [
  {
    id: 'evt-20',
    fromStatus: null,
    toStatus: 'request_received',
    createdAt: '2026-11-24T08:00:00.000Z',
  },
  {
    id: 'evt-21',
    fromStatus: 'request_received',
    toStatus: 'service_in_progress',
    createdAt: '2026-11-24T10:00:00.000Z',
  },
  {
    id: 'evt-22',
    fromStatus: 'service_in_progress',
    toStatus: 'ready_for_collection',
    createdAt: '2026-11-24T14:00:00.000Z',
  },
  {
    id: 'evt-23',
    fromStatus: 'ready_for_collection',
    toStatus: 'completed',
    createdAt: '2026-11-24T16:15:00.000Z',
  },
];

describe('buildCustomerRepairTimeline', () => {
  it('builds a pending journey with a single active current milestone', () => {
    const result = buildCustomerRepairTimeline({
      jobCardId: 'job-pending-1',
      events: PENDING_SEQUENCE_FIXTURE,
    });

    expect(result.jobCardId).toBe('job-pending-1');
    expect(result.journeyKind).toBe('pending');
    expect(result.milestones).toHaveLength(3);
    expect(result.milestones[0]?.state).toBe('completed');
    expect(result.milestones[1]?.state).toBe('completed');
    expect(result.milestones[2]?.status).toBe('inspection_in_progress');
    expect(result.milestones[2]?.state).toBe('current');
    expect(result.milestones[2]?.isCurrent).toBe(true);
    expect(result.milestones.filter((m) => m.isCurrent)).toHaveLength(1);
  });

  it('marks waiting_for_parts as delayed and sets journeyKind to delayed', () => {
    const result = buildCustomerRepairTimeline({
      jobCardId: 'job-delayed-1',
      events: DELAYED_SEQUENCE_FIXTURE,
    });

    expect(result.journeyKind).toBe('delayed');
    const latest = result.milestones.at(-1);
    expect(latest?.status).toBe('waiting_for_parts');
    expect(latest?.label).toBe('Waiting for parts');
    expect(latest?.state).toBe('delayed');
    expect(latest?.isCurrent).toBe(true);
  });

  it('marks completed journeys as completed with no active current step', () => {
    const result = buildCustomerRepairTimeline({
      jobCardId: 'job-completed-1',
      events: COMPLETED_SEQUENCE_FIXTURE,
    });

    expect(result.journeyKind).toBe('completed');
    const latest = result.milestones.at(-1);
    expect(latest?.status).toBe('completed');
    expect(latest?.state).toBe('completed');
    expect(latest?.isCurrent).toBe(false);
    expect(result.milestones.some((m) => m.isCurrent)).toBe(false);
  });

  it('sorts out-of-order events chronologically by timestamp', () => {
    const scrambled: readonly CustomerStatusEventInput[] = [
      COMPLETED_SEQUENCE_FIXTURE[2],
      COMPLETED_SEQUENCE_FIXTURE[0],
      COMPLETED_SEQUENCE_FIXTURE[3],
      COMPLETED_SEQUENCE_FIXTURE[1],
    ];

    const result = buildCustomerRepairTimeline({
      jobCardId: 'job-unordered-1',
      events: scrambled,
    });

    expect(result.milestones.map((m) => m.id)).toEqual([
      'evt-20',
      'evt-21',
      'evt-22',
      'evt-23',
    ]);
  });

  it('handles missing or invalid timestamps safely without Invalid Date', () => {
    const eventsWithMissingDates: readonly CustomerStatusEventInput[] = [
      {
        id: 'evt-missing',
        fromStatus: 'request_received',
        toStatus: 'awaiting_approval',
        createdAt: null,
      },
      {
        id: 'evt-dated',
        fromStatus: null,
        toStatus: 'request_received',
        createdAt: '2026-11-26T08:00:00.000Z',
      },
      {
        id: 'evt-invalid',
        fromStatus: 'awaiting_approval',
        toStatus: 'service_in_progress',
        createdAt: 'not-a-timestamp',
      },
    ];

    const result = buildCustomerRepairTimeline({
      jobCardId: 'job-dates-1',
      events: eventsWithMissingDates,
    });

    expect(result.milestones[0]?.id).toBe('evt-dated');
    expect(result.milestones[0]?.isoTimestamp).toBe('2026-11-26T08:00:00.000Z');
    expect(result.milestones[0]?.formattedDate).toBeTruthy();

    for (const undated of result.milestones.slice(1)) {
      expect(undated.isoTimestamp).toBeNull();
      expect(undated.formattedDate).toBeNull();
      expect(undated.formattedDate ?? '').not.toContain('Invalid Date');
    }
  });

  it('never leaks technician notes or extra fields into milestone output', () => {
    const rawEventWithTechnicianNote = {
      id: 'evt-sec-1',
      fromStatus: 'inspection_in_progress',
      toStatus: 'waiting_for_parts',
      createdAt: '2026-11-26T12:00:00.000Z',
      note: 'SECRET TECH NOTE: bypassed immobilizer relay in bay 2',
      technicianNotes: 'Internal torque override',
      marginPercent: 42,
    } as CustomerStatusEventInput;

    const result = buildCustomerRepairTimeline({
      jobCardId: 'job-sec-1',
      events: [rawEventWithTechnicianNote],
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('SECRET TECH NOTE');
    expect(serialized).not.toContain('immobilizer relay');
    expect(serialized).not.toContain('Internal torque override');
    expect(serialized).not.toContain('marginPercent');
  });

  it('rejects mismatched customer ownership when both owner and viewer IDs are provided', () => {
    expect(() =>
      buildCustomerRepairTimeline({
        jobCardId: 'job-owner-1',
        events: PENDING_SEQUENCE_FIXTURE,
        ownerCustomerId: 'cust-alpha',
        viewerCustomerId: 'cust-beta',
      }),
    ).toThrow('Customer ownership mismatch for repair timeline.');
  });

  it('updates timeline progression when an adapter emits a new status event', () => {
    let currentEvents: CustomerStatusEventInput[] = [...PENDING_SEQUENCE_FIXTURE];
    const firstRender = buildCustomerRepairTimeline({
      jobCardId: 'job-live-1',
      events: currentEvents,
    });
    expect(firstRender.milestones.at(-1)?.status).toBe('inspection_in_progress');
    expect(firstRender.journeyKind).toBe('pending');

    // Simulate server/adapter event advancing to waiting_for_parts
    currentEvents = [
      ...currentEvents,
      {
        id: 'evt-live-4',
        fromStatus: 'inspection_in_progress',
        toStatus: 'waiting_for_parts',
        createdAt: '2026-11-26T13:10:00.000Z',
      },
    ];

    const secondRender = buildCustomerRepairTimeline({
      jobCardId: 'job-live-1',
      events: currentEvents,
    });
    expect(secondRender.milestones.at(-1)?.status).toBe('waiting_for_parts');
    expect(secondRender.milestones.at(-1)?.state).toBe('delayed');
    expect(secondRender.journeyKind).toBe('delayed');
  });
});