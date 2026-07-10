import { beforeEach, describe, expect, it, vi } from 'vitest';

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
