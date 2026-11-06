import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core'

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
  recalculateQuoteTotals
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

describe('BD-025: recalculateQuoteTotals', () => {
  const dialect = new PgDialect();

  // The function makes two database calls: SELECT the lines, then UPDATE the quote.
  function mockLines(rows: Array<Record<string, string>>) {
    dbMock.execute.mockResolvedValueOnce({ rows }).mockResolvedValueOnce({ rows: [] });
  }

  // The first three values sent in the UPDATE (the second call).
  function savedTotals() {
    const updateCall = dbMock.execute.mock.calls[1][0];
    return dialect.sqlToQuery(updateCall).params.slice(0, 3);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds 15% VAT to the saved line totals', async () => {
    mockLines([{ total: '200.00' }]);

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    expect(savedTotals()).toEqual(['200', '30', '230']);
  });

  it.fails('BUG: saves unrounded values (R0.10 + R0.20)', async () => {
    mockLines([{ total: '0.10' }, { total: '0.20' }]);

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    expect(savedTotals()[0]).toBe('0.30');
  });

  it.fails('BUG: ignores the line discount (should save R218.50)', async () => {
    mockLines([
      { discount: '10.00', quantity: '2', tax_rate: '15', total: '200.00', unit_price: '100.00' },
    ]);

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    expect(savedTotals()).toContain('218.50');
  });

  it.fails('BUG: charges 15% on a 0% VAT line', async () => {
    mockLines([
      { discount: '0', quantity: '1', tax_rate: '0', total: '100.00', unit_price: '100.00' },
    ]);

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    expect(savedTotals()).toEqual(['100.00', '0.00', '0.00']);
  });
});
