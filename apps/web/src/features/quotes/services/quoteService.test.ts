import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock('@/lib/auth/auth-guards', () => authGuardMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import {
  addQuoteLineItem,
  createQuoteFromJobCard,
  getQuoteWithItems,
  lockApprovedQuote,
  sendQuoteToCustomer,
} from './quoteService';

describe('quoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('creates a draft quote from a job card', async () => {
    dbMock.execute.mockResolvedValueOnce({ rows: [{ id: 'quote-1', status: 'draft' }] });

    await expect(
      createQuoteFromJobCard('tenant-1', 'job-1', 'customer-1'),
    ).resolves.toMatchObject({ id: 'quote-1' });

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith('tenant-1', 'quotes.create');
    expect(dbMock.execute).toHaveBeenCalledTimes(1);
  });

  it('returns a quote with its line items', async () => {
    dbMock.execute
      .mockResolvedValueOnce({ rows: [{ id: 'quote-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'line-1' }] });

    await expect(getQuoteWithItems('tenant-1', 'quote-1')).resolves.toEqual({
      id: 'quote-1',
      items: [{ id: 'line-1' }],
    });
  });

  it('returns null when quote is missing', async () => {
    dbMock.execute.mockResolvedValueOnce({ rows: [] });

    await expect(getQuoteWithItems('tenant-1', 'missing')).resolves.toBeNull();
  });

  it('adds a quote line item and recalculates totals', async () => {
    dbMock.execute
      .mockResolvedValueOnce({ rows: [{ id: 'quote-1', status: 'draft' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'line-1' }] })
      .mockResolvedValueOnce({ rows: [{ total: '950' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      addQuoteLineItem('tenant-1', 'quote-1', 'job-1', {
        description: 'Brake pads',
        quantity: 1,
        type: 'part',
        unitPrice: 950,
      }),
    ).resolves.toMatchObject({ id: 'line-1' });
  });

  it('prevents sending empty quotes', async () => {
    dbMock.execute
      .mockResolvedValueOnce({ rows: [{ status: 'draft' }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(sendQuoteToCustomer('tenant-1', 'quote-1')).rejects.toThrow(
      'Cannot send a quote with no line items.',
    );
  });

  it('locks approved quotes when no items are pending', async () => {
    dbMock.execute
      .mockResolvedValueOnce({ rows: [{ status: 'approved' }] })
      .mockResolvedValueOnce({ rows: [{ approval_status: 'approved' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'quote-1', status: 'locked' }] });

    await expect(lockApprovedQuote('tenant-1', 'quote-1')).resolves.toMatchObject({
      id: 'quote-1',
      status: 'locked',
    });
  });
});
