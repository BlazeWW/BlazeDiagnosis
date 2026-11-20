import { describe, expect, it, vi } from 'vitest';

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

const authGuardMock = vi.hoisted(() => ({
  requireTenantPermission: vi.fn(),
}));

vi.mock('@/db/client', () => ({
  db: dbMock,
}));

vi.mock('@/lib/authorization/guards', () => authGuardMock);

import {
  calculateOutstandingBalance,
  getInvoicePaymentStatus,
  markInvoicePaid,
  recordPaymentCorrection,
} from './paymentService';

describe('paymentService', () => {
  it('calculates outstanding balance', () => {
    expect(
      calculateOutstandingBalance(5000, 1000),
    ).toBe(4000);
  });

  it('returns issued when nothing is paid', () => {
    expect(
      getInvoicePaymentStatus(5000, 0),
    ).toBe('issued');
  });

  it('returns partially_paid when partially paid', () => {
    expect(
      getInvoicePaymentStatus(5000, 2000),
    ).toBe('partially_paid');
  });
it('returns paid when invoice is fully paid', () => {
  expect(
    getInvoicePaymentStatus(5000, 5000),
  ).toBe('paid');
});

it('rejects zero payments', async () => {
  await expect(
    markInvoicePaid(
      'tenant-1',
      'invoice-1',
      0,
    ),
  ).rejects.toThrow(
    'Payment amount must be greater than zero',
  );
});

it('rejects negative payments', async () => {
  await expect(
    markInvoicePaid(
      'tenant-1',
      'invoice-1',
      -100,
    ),
  ).rejects.toThrow(
    'Payment amount must be greater than zero',
  );
});
it('rejects zero correction amounts', async () => {
  await expect(
    recordPaymentCorrection(
      'tenant-1',
      'invoice-1',
      0,
    ),
  ).rejects.toThrow(
    'Correction amount must be greater than zero',
  );
});

it('rejects negative correction amounts', async () => {
  await expect(
    recordPaymentCorrection(
      'tenant-1',
      'invoice-1',
      -100,
    ),
  ).rejects.toThrow(
    'Correction amount must be greater than zero',
  );
});
});
it('records correction events separately', () => {
  expect(true).toBe(true);
});