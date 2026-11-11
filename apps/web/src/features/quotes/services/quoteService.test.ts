import { calculateQuoteTotals } from '@/lib/quoteTotals';
import { PgDialect } from 'drizzle-orm/pg-core';
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
  declineQuoteLineItem,
  getQuoteWithItems,
  lockApprovedQuote,
  recalculateQuoteTotals,
  sendQuoteToCustomer,
} from './quoteService';

describe('quoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('creates a draft quote from a job card', async () => {
    dbMock.execute.mockResolvedValueOnce({
      rows: [{ id: 'quote-1', status: 'draft' }],
    });

    await expect(
      createQuoteFromJobCard('tenant-1', 'job-1', 'customer-1'),
    ).resolves.toMatchObject({ id: 'quote-1' });

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith(
      'tenant-1',
      'quotes.create',
    );
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
      .mockResolvedValueOnce({
        rows: [
          {
            discount: '0',
            quantity: '1',
            tax_rate: '15',
            unit_price: '950.00',
          },
        ],
      })
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

    await expect(
      lockApprovedQuote('tenant-1', 'quote-1'),
    ).resolves.toMatchObject({
      id: 'quote-1',
      status: 'locked',
    });
  });
});

describe('BD-025: recalculateQuoteTotals', () => {
  const dialect = new PgDialect();

  // The function makes two database calls: SELECT the lines, then UPDATE the quote.
  function mockLines(rows: Array<Record<string, string>>) {
    dbMock.execute
      .mockResolvedValueOnce({ rows })
      .mockResolvedValueOnce({ rows: [] });
  }

  // [subtotal, discount_total, tax_total, total] as sent in the UPDATE (second call).
  function savedTotals() {
    const updateCall = dbMock.execute.mock.calls[1][0];
    return dialect.sqlToQuery(updateCall).params.slice(0, 4);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds 15% VAT to the saved line totals', async () => {
    mockLines([
      { discount: '0', quantity: '2', tax_rate: '15', unit_price: '100.00' },
    ]);

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    expect(savedTotals()).toEqual(['200.00', '0.00', '30.00', '230.00']);
  });

  it('saves values rounded to cents (R0.10 + R0.20)', async () => {
    mockLines([
      { discount: '0', quantity: '1', tax_rate: '0', unit_price: '0.10' },
      { discount: '0', quantity: '1', tax_rate: '0', unit_price: '0.20' },
    ]);

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    expect(savedTotals()[0]).toBe('0.30');
  });

  it('applies the line discount (saves R218.50)', async () => {
    mockLines([
      {
        discount: '10.00',
        quantity: '2',
        tax_rate: '15',
        total: '200.00',
        unit_price: '100.00',
      },
    ]);

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    expect(savedTotals()).toContain('218.50');
  });

  it('charges no VAT on a 0% line', async () => {
    mockLines([
      {
        discount: '0',
        quantity: '1',
        tax_rate: '0',
        total: '100.00',
        unit_price: '100.00',
      },
    ]);

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    expect(savedTotals()).toEqual(['100.00', '0.00', '0.00', '100.00']);
  });

  it('saves the default VAT rate and the line amount on new lines', async () => {
    dbMock.execute
      .mockResolvedValueOnce({ rows: [{ id: 'quote-1', status: 'draft' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'line-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await addQuoteLineItem('tenant-1', 'quote-1', 'job-1', {
      description: 'Brake pads',
      quantity: 2,
      type: 'part',
      unitPrice: 100,
    });

    const insertValues = dialect.sqlToQuery(
      dbMock.execute.mock.calls[1][0],
    ).params;
    expect(insertValues).toContain('200.00');
    expect(insertValues).toContain(15);
  });
});

describe('BD-025: approval effects on quote totals', () => {
  const dialect = new PgDialect();

  // recordQuoteLineDecision makes five calls: read the quote, update the line,
  // record the approval event, read every line's status, update the quote status.
  function mockDecline() {
    dbMock.execute
      .mockResolvedValueOnce({
        rows: [{ customer_id: 'customer-1', locked_at: null, status: 'sent' }],
      })
      .mockResolvedValueOnce({
        rows: [{ approval_status: 'declined', id: 'line-2' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { approval_status: 'approved' },
          { approval_status: 'declined' },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('marks the quote partially approved when one of two lines is declined', async () => {
    mockDecline();

    await declineQuoteLineItem(
      'tenant-1',
      'quote-1',
      'line-2',
      'customer-1',
      'Too expensive',
    );

    const statusUpdate = dialect.sqlToQuery(dbMock.execute.mock.calls[4][0]);
    expect(statusUpdate.params[0]).toBe('partially_approved');
  });

  it('does not recalculate the quote total after a decline (finding 5)', async () => {
    mockDecline();

    await declineQuoteLineItem(
      'tenant-1',
      'quote-1',
      'line-2',
      'customer-1',
      'Too expensive',
    );

    // Exactly the five calls above; none recalculates totals, so the saved
    // quote total still includes the declined line. Question 5 asks if that's intended.
    expect(dbMock.execute).toHaveBeenCalledTimes(5);
  });
});

describe('BD-025: screen and server totals agree', () => {
  const dialect = new PgDialect();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('the server saves the same total the screen shows', async () => {
    const onScreen = calculateQuoteTotals([
      {
        approvalRequirement: 'recommended',
        category: 'part',
        description: 'Brake pads',
        discount: 10,
        id: 'line-1',
        quantity: 2,
        taxRate: 15,
        unitPrice: 100,
      },
    ]);
    expect(onScreen.total).toBe(218.5);

    dbMock.execute
      .mockResolvedValueOnce({
        rows: [
          {
            discount: '10.00',
            quantity: '2',
            tax_rate: '15',
            total: '200.00',
            unit_price: '100.00',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    await recalculateQuoteTotals('tenant-1', 'quote-1');

    const saved = dialect.sqlToQuery(dbMock.execute.mock.calls[1][0]).params;
    expect(saved).toContain('218.50');
  });
});
