import { describe, expect, it } from 'vitest';

import {
  toCustomerServiceHistoryItem,
  type ServiceHistoryJobRow,
} from './serviceHistorySerializer';

const job: ServiceHistoryJobRow = {
  completedAt: null,
  createdAt: new Date('2026-10-01T08:00:00.000Z'),
  customerStatus: 'waiting_for_parts',
  expectedCompletionAt: new Date('2026-10-05T15:00:00.000Z'),
  jobCardId: 'job-1',
  jobNumber: 'JOB-1001',
  vehicleMake: 'Toyota',
  vehicleModel: 'Hilux',
  vehicleRegistrationNumber: 'CA 123-456',
  vehicleYear: 2019,
};

describe('toCustomerServiceHistoryItem', () => {
  it('copies only customer-safe fields even when internal fields are present', () => {
    const rowWithInternalFields = {
      ...job,
      assignedMechanicId: 'mechanic-1',
      internalStatus: 'awaiting_parts',
      priority: 'urgent',
      tenantId: 'tenant-1',
    } as ServiceHistoryJobRow;

    const item = toCustomerServiceHistoryItem(rowWithInternalFields, {
      invoices: [],
      notes: [],
      quotes: [],
    });

    expect(Object.keys(item).sort()).toEqual([
      'completedAt',
      'documents',
      'expectedCompletionAt',
      'isOngoing',
      'jobCardId',
      'jobNumber',
      'notes',
      'openedAt',
      'status',
      'statusLabel',
      'vehicle',
    ]);
    expect(JSON.stringify(item)).not.toMatch(
      /mechanic-1|awaiting_parts|urgent|tenant-1/,
    );
    expect(item).toMatchObject({
      isOngoing: true,
      openedAt: '2026-10-01T08:00:00.000Z',
      status: 'waiting_for_parts',
      statusLabel: 'Waiting for parts',
      vehicle: {
        make: 'Toyota',
        model: 'Hilux',
        registrationNumber: 'CA 123-456',
        year: 2019,
      },
    });
  });

  it('keeps customer notes and drops internal or supplier notes', () => {
    const item = toCustomerServiceHistoryItem(job, {
      invoices: [],
      notes: [
        {
          body: 'Brake pads ordered.',
          createdAt: new Date('2026-10-02T09:00:00.000Z'),
          jobCardId: 'job-1',
          visibility: 'customer',
        },
        {
          body: 'Supplier margin 35%.',
          createdAt: new Date('2026-10-02T10:00:00.000Z'),
          jobCardId: 'job-1',
          visibility: 'internal',
        },
        {
          body: 'Supplier ETA Friday.',
          createdAt: new Date('2026-10-02T11:00:00.000Z'),
          jobCardId: 'job-1',
          visibility: 'supplier',
        },
      ],
      quotes: [],
    });

    expect(item.notes).toEqual([
      { body: 'Brake pads ordered.', createdAt: '2026-10-02T09:00:00.000Z' },
    ]);
  });

  it('shows sent quotes and issued invoices but never drafts or other jobs', () => {
    const item = toCustomerServiceHistoryItem(job, {
      invoices: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-1',
          issuedAt: new Date('2026-10-04T12:00:00.000Z'),
          jobCardId: 'job-1',
          status: 'issued',
          total: '1500.00',
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-2',
          issuedAt: null,
          jobCardId: 'job-1',
          status: 'draft',
          total: '99.00',
        },
      ],
      notes: [],
      quotes: [
        {
          id: 'quote-1',
          jobCardId: 'job-1',
          quoteNumber: 'Q-1',
          sentAt: new Date('2026-10-02T12:00:00.000Z'),
          status: 'approved',
          total: '1500.00',
        },
        {
          id: 'quote-2',
          jobCardId: 'job-1',
          quoteNumber: 'Q-2',
          sentAt: null,
          status: 'draft',
          total: '10.00',
        },
        {
          id: 'quote-3',
          jobCardId: 'job-2',
          quoteNumber: 'Q-3',
          sentAt: null,
          status: 'sent',
          total: '20.00',
        },
      ],
    });

    expect(item.documents).toEqual([
      {
        id: 'quote-1',
        issuedAt: '2026-10-02T12:00:00.000Z',
        number: 'Q-1',
        status: 'approved',
        total: '1500.00',
        type: 'quote',
      },
      {
        id: 'inv-1',
        issuedAt: '2026-10-04T12:00:00.000Z',
        number: 'INV-1',
        status: 'issued',
        total: '1500.00',
        type: 'invoice',
      },
    ]);
  });

  it('marks completed jobs as not ongoing', () => {
    const item = toCustomerServiceHistoryItem(
      {
        ...job,
        completedAt: new Date('2026-10-06T10:00:00.000Z'),
        customerStatus: 'completed',
      },
      { invoices: [], notes: [], quotes: [] },
    );

    expect(item.isOngoing).toBe(false);
    expect(item.completedAt).toBe('2026-10-06T10:00:00.000Z');
    expect(item.statusLabel).toBe('Completed');
  });
});
