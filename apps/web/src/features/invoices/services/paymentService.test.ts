import { describe, expect, it } from 'vitest';

import {
  calculateOutstandingBalance,
  getInvoicePaymentStatus,
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
});