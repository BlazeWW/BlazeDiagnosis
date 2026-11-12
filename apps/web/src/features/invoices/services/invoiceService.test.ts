import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSelectWhereChain, createSelectWhereLimitChain } from '@/test/drizzleMock';
import { calculateDocumentTotals, centsToString } from '@/lib/money/cents';

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));
const auditWriterMock = vi.hoisted(() => ({
  default: {
    writeAudit: vi.fn(),
  },
}));
const notificationServiceMock = vi.hoisted(() => ({
  createInvoiceNotificationRecord: vi.fn(),
}));
const dbMock = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);
vi.mock('@/lib/auditWriter', () => auditWriterMock);
vi.mock('@/features/notifications/services/notificationService', () => notificationServiceMock);
vi.mock('@/db/client', () => ({ db: dbMock }));

import { createInvoiceFromApprovedQuote } from './invoiceService';

describe('invoiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('creates an invoice from approved and billable quote items', async () => {
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce({
          values: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([
                {
                  id: 'invoice-1',
                  invoiceNumber: 'INV-1',
                  total: '115.00',
                },
              ]),
            ),
          })),
        })
        .mockReturnValueOnce({
          values: vi.fn(() => Promise.resolve()),
        }),
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    customerId: 'customer-1',
                    id: 'quote-1',
                    jobCardId: 'job-1',
                    status: 'approved',
                  },
                ]),
              ),
            })),
          })),
        })
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() =>
              Promise.resolve([
                {
                  category: 'part',
                  description: 'Brake pads',
                  discount: '0',
                  id: 'line-1',
                  quantity: '1',
                  taxRate: '15',
                  total: '115.00',
                  unitPrice: '100',
                },
              ]),
            ),
          })),
        }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    };
    dbMock.transaction.mockImplementation((callback) => callback(tx));

    await expect(
      createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1'),
    ).resolves.toMatchObject({ id: 'invoice-1' });

    expect(authGuardMock.requireTenantPermission).toHaveBeenCalledWith(
      'tenant-1',
      'invoices.create',
    );
    expect(auditWriterMock.default.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'INVOICE', resourceId: 'invoice-1' }),
    );
    expect(notificationServiceMock.createInvoiceNotificationRecord).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'invoice-1', tenantId: 'tenant-1' }),
      tx,
    );
  });

  it('prevents invoicing locked quotes', async () => {
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ id: 'quote-1', status: 'locked' }])),
          })),
        })),
      })),
    };
    dbMock.transaction.mockImplementation((callback) => callback(tx));

    await expect(
      createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1'),
    ).rejects.toThrow('already been processed and locked');
  });
});

describe('BD-025: invoice totals', () => {
  // One quote line as the database returns it (numbers arrive as strings).
  function line(overrides: Record<string, string> = {}) {
    return {
      category: 'part',
      description: 'Brake pads',
      discount: '0',
      id: 'line-1',
      quantity: '1',
      taxRate: '15',
      total: '100.00',
      unitPrice: '100.00',
      ...overrides,
    };
  }

  // A fake transaction: an approved quote, then the given billable lines.
  function createInvoiceTx(lines: Array<Record<string, string>>) {
    const invoiceValues = vi.fn(() => ({
      returning: vi.fn(() =>
        Promise.resolve([{ id: 'invoice-1', invoiceNumber: 'INV-1', total: '0.00' }]),
      ),
    }));
    const lineValues = vi.fn(() => Promise.resolve());
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce({ values: invoiceValues })
        .mockReturnValueOnce({ values: lineValues }),
      select: vi
        .fn()
        .mockReturnValueOnce(
          createSelectWhereLimitChain([
            { customerId: 'customer-1', id: 'quote-1', jobCardId: 'job-1', status: 'approved' },
          ]),
        )
        .mockReturnValueOnce(createSelectWhereChain(lines)),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
    };
    dbMock.transaction.mockImplementation((callback) => callback(tx));

    return { invoiceValues, lineValues };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  });

  it('applies a R10 discount before VAT (2 x R100 = R218.50)', async () => {
    const { invoiceValues } = createInvoiceTx([
      line({ discount: '10.00', quantity: '2', total: '200.00' }),
    ]);

    await createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1');

    expect(invoiceValues).toHaveBeenCalledWith(
      expect.objectContaining({
        discountTotal: '10.00',
        subtotal: '200.00',
        taxTotal: '28.50',
        total: '218.50',
      }),
    );
  });

  it('caps the discount total at the line subtotal', async () => {
    const { invoiceValues } = createInvoiceTx([
      line({ discount: '80.00', total: '50.00', unitPrice: '50.00' }),
    ]);

    await createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1');

    expect(invoiceValues).toHaveBeenCalledWith(
      expect.objectContaining({ discountTotal: '50.00', total: '0.00' }),
    );
  });

  it('rounds VAT per line (10 lines of R0.03 have no VAT)', async () => {
    const { invoiceValues } = createInvoiceTx(
      Array.from({ length: 10 }, (_, index) =>
        line({ id: `line-${index}`, total: '0.03', unitPrice: '0.03' }),
      ),
    );

    await createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1');

    expect(invoiceValues).toHaveBeenCalledWith(
      expect.objectContaining({ taxTotal: '0.00', total: '0.30' }),
    );
  });

  it('rounds VAT of R8.9955 up to R9.00 (3 x R19.99)', async () => {
    const { invoiceValues } = createInvoiceTx([
      line({ quantity: '3', total: '59.97', unitPrice: '19.99' }),
    ]);

    await createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1');

    expect(invoiceValues).toHaveBeenCalledWith(
      expect.objectContaining({ taxTotal: '9.00', total: '68.97' }),
    );
  });

  it('invoices only the billable lines of a partially approved quote', async () => {
    // The SQL filter returns approved and not_required lines; line-2 was declined.
    const { invoiceValues, lineValues } = createInvoiceTx([
      line(),
      line({ id: 'line-3', total: '50.00', unitPrice: '50.00' }),
    ]);

    await createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1');

    expect(invoiceValues).toHaveBeenCalledWith(
      expect.objectContaining({ subtotal: '150.00', taxTotal: '22.50', total: '172.50' }),
    );
    expect(lineValues).toHaveBeenCalledWith([
      expect.objectContaining({ quoteLineItemId: 'line-1' }),
      expect.objectContaining({ quoteLineItemId: 'line-3' }),
    ]);
  });

  it('refuses to invoice a quote with no billable lines', async () => {
    createInvoiceTx([]);

    await expect(
      createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1'),
    ).rejects.toThrow('Cannot create an invoice without approved or billable quote items.');
  });

  it('saves exactly what the shared money module calculates', async () => {
    const lines = [
      line({ discount: '10.00', quantity: '2', total: '200.00' }),
      line({ id: 'line-2', quantity: '1.5', total: '675.00', unitPrice: '450.00' }),
    ];
    const { invoiceValues } = createInvoiceTx(lines);

    await createInvoiceFromApprovedQuote('tenant-1', 'quote-1', 'actor-1');

    const expected = calculateDocumentTotals(lines);
    expect(invoiceValues).toHaveBeenCalledWith(
      expect.objectContaining({ total: centsToString(expected.total) }),
    );
  });
});

