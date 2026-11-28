import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));

const auditWriterMock = vi.hoisted(() => ({
  default: {
    writeAudit: vi.fn(),
  },
}));

vi.mock('@/db/client', () => ({
  db: dbMock,
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);

vi.mock('@/lib/auditWriter', () => auditWriterMock);

import {
  calculateOutstandingBalance,
  getInvoicePaymentStatus,
  markInvoicePaid,
  recordPaymentCorrection,
} from './paymentService';

function mockSelectInvoice(invoiceRow: Record<string, unknown> | undefined) {
  const where = vi.fn().mockResolvedValue(invoiceRow ? [invoiceRow] : []);
  const from = vi.fn(() => ({ where }));
  dbMock.select.mockReturnValue({ from });
}

function mockInsertAndUpdate() {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  dbMock.insert.mockReturnValue({ values: insertValues });
const updateReturning = vi.fn().mockResolvedValue([]);
  const updateWhere = vi.fn(() =>
    Object.assign(Promise.resolve(undefined), {
      returning: updateReturning,
    }),
  );
  const updatesSet = vi.fn(() => ({ where: updateWhere }));
  dbMock.update.mockReturnValue({ set: updatesSet });

  return { insertValues, updatesSet, updateWhere, updateReturning };
}

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.transaction.mockImplementation(async (cb) => cb(dbMock));
  authGuardMock.requireTenantPermission.mockResolvedValue(undefined);
  auditWriterMock.default.writeAudit.mockResolvedValue(undefined);
});

  it('calculates outstanding balance', () => {
    expect(calculateOutstandingBalance(5000, 1000)).toBe(4000);
  });

  it('returns issued when nothing is paid', () => {
    expect(getInvoicePaymentStatus(5000, 0)).toBe('issued');
  });

  it('returns partially_paid when partially paid', () => {
    expect(getInvoicePaymentStatus(5000, 2000)).toBe('partially_paid');
  });

  it('returns paid when invoice is fully paid', () => {
    expect(getInvoicePaymentStatus(5000, 5000)).toBe('paid');
  });

  it('rejects zero payments', async () => {
    await expect(
      markInvoicePaid('tenant-1', 'invoice-1', 0),
    ).rejects.toThrow('Payment amount must be greater than zero');
  });

  it('rejects negative payments', async () => {
    await expect(
      markInvoicePaid('tenant-1', 'invoice-1', -100),
    ).rejects.toThrow('Payment amount must be greater than zero');
  });

  it('rejects zero correction amounts', async () => {
    await expect(
      recordPaymentCorrection('tenant-1', 'invoice-1', 0),
    ).rejects.toThrow('Correction amount must be greater than zero');
  });

  it('rejects negative correction amounts', async () => {
    await expect(
      recordPaymentCorrection('tenant-1', 'invoice-1', -100),
    ).rejects.toThrow('Correction amount must be greater than zero');
  });

  it('records a partial payment, updates invoice state, and writes an audit log', async () => {
    mockSelectInvoice({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      total: '5000',
      amountPaid: '0',
      paidAt: null,
    });
    const { insertValues, updatesSet, updateReturning } = mockInsertAndUpdate();
    updateReturning.mockResolvedValueOnce([{ amountPaid: '2000' }]);
    const result = await markInvoicePaid('tenant-1', 'invoice-1', 2000);

    expect(result).toEqual({
      invoiceId: 'invoice-1',
      amountPaid: 2000,
      status: 'partially_paid',
    });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        invoiceId: 'invoice-1',
        amount: '2000',
        method: 'manual',
        status: 'completed',
      }),
    );
    expect(updatesSet).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
            status: 'partially_paid',
            paidAt: null,
  }),
);
    expect(auditWriterMock.default.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'INVOICE',
        resourceId: 'invoice-1',
        action: 'UPDATE',
      }),
    );
  });

  it('rejects payments exceeding outstanding balance', async () => {
    mockSelectInvoice({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      total: '5000',
      amountPaid: '4000',
      paidAt: null,
    });
    const { insertValues, updateReturning } = mockInsertAndUpdate();updateReturning.mockResolvedValueOnce([]);

await expect(
  markInvoicePaid('tenant-1', 'invoice-1', 1500),
).rejects.toThrow('Payment exceeds outstanding balance');

expect(insertValues).not.toHaveBeenCalled();
expect(updateReturning).toHaveBeenCalledTimes(1);
  });
  it('records a payment correction and updates balance and status', async () => {
    mockSelectInvoice({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      total: '5000',
      amountPaid: '5000',
      paidAt: new Date('2026-11-20T00:00:00.000Z'),
    });
    const { insertValues, updatesSet, updateReturning } = mockInsertAndUpdate();
    updateReturning.mockResolvedValueOnce([{ amountPaid: '2000' }]);
    const result = await recordPaymentCorrection('tenant-1', 'invoice-1', 3000);

    expect(result).toEqual({
      invoiceId: 'invoice-1',
      amountPaid: 2000,
      status: 'partially_paid',
    });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        invoiceId: 'invoice-1',
        amount: '-3000',
        method: 'manual',
        status: 'completed',
      }),
    );
     expect(updatesSet).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
            status: 'partially_paid',
             paidAt: null,
            }),
        );
    expect(auditWriterMock.default.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'INVOICE',
        resourceId: 'invoice-1',
        action: 'UPDATE',
      }),
    );
  });

  it('rejects correction amounts exceeding amount paid', async () => {
    mockSelectInvoice({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      total: '5000',
      amountPaid: '1000',
      paidAt: null,
    });
    const { insertValues, updateReturning } = mockInsertAndUpdate();
    updateReturning.mockResolvedValueOnce([]);

    await expect(
        recordPaymentCorrection('tenant-1', 'invoice-1', 1500),
    ).rejects.toThrow('Correction amount cannot exceed amount paid');

    expect(insertValues).not.toHaveBeenCalled();
    expect(updateReturning).toHaveBeenCalledTimes(1);
  });

  it('prevents unauthorized cross-tenant payment from altering an invoice', async () => {
    authGuardMock.requireTenantPermission.mockRejectedValueOnce(
      new Error('Forbidden'),
    );
     const { insertValues, updateReturning } = mockInsertAndUpdate();
     await expect(
        markInvoicePaid('tenant-2', 'invoice-1', 1000),
    ).rejects.toThrow('Forbidden');
    
    expect(insertValues).not.toHaveBeenCalled();
  expect(updateReturning).not.toHaveBeenCalled();
});
});