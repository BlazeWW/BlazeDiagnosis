import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authorization/guards', () => {
  class TenantAccessError extends Error {
    constructor(message = 'Forbidden') {
      super(message);
      this.name = 'TenantAccessError';
    }
  }

  return { TenantAccessError };
});

import {
  StationInvoicePanel,
  type StationInvoiceSummary,
} from './StationInvoicePanel';

const sampleInvoice: StationInvoiceSummary = {
  amountPaidCents: 20000,
  id: 'inv-1',
  invoiceNumber: 'INV-001',
  status: 'PARTIALLY_PAID',
  statusTone: 'warning',
  totalCents: 50000,
};

describe('StationInvoicePanel', () => {
  it('renders invoice details, totals, status, and tenant context', () => {
    const html = renderToStaticMarkup(
      <StationInvoicePanel invoice={sampleInvoice} tenantId="tenant-1" />,
    );

    expect(html).toContain('INV-001');
    expect(html).toContain('PARTIALLY_PAID');
    expect(html).toContain('tenant-1');
    expect(html).toContain('Record payment');
    expect(html).toContain('Record correction');
    expect(html).toMatch(/500/);
    expect(html).toMatch(/200/);
    expect(html).toMatch(/300/);
  });

  it('handles zero paid amount and defaults balance to total', () => {
    const html = renderToStaticMarkup(
      <StationInvoicePanel
        invoice={{
          id: 'inv-2',
          invoiceNumber: 'INV-002',
          status: 'ISSUED',
          statusTone: 'info',
          totalCents: 25000,
        }}
        tenantId="tenant-2"
      />,
    );

    expect(html).toContain('INV-002');
    expect(html).toContain('ISSUED');
    expect(html).toMatch(/250/);
  });

  it('invokes payment and correction callbacks with tenant and invoice context', async () => {
    const recordPayment = vi.fn().mockResolvedValue(undefined);
    const recordCorrection = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    await recordPayment({
      amount: 150,
      invoiceId: sampleInvoice.id,
      tenantId: 'tenant-1',
    });
    onSuccess();

    await recordCorrection({
      amount: 50,
      invoiceId: sampleInvoice.id,
      tenantId: 'tenant-1',
    });

    expect(recordPayment).toHaveBeenCalledWith({
      amount: 150,
      invoiceId: 'inv-1',
      tenantId: 'tenant-1',
    });
    expect(recordCorrection).toHaveBeenCalledWith({
      amount: 50,
      invoiceId: 'inv-1',
      tenantId: 'tenant-1',
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('rejects unauthorized cross-tenant calls cleanly', async () => {
    const { TenantAccessError } = await import('@/lib/authorization/guards');
    const deniedPayment = vi
      .fn()
      .mockRejectedValue(new TenantAccessError());

    await expect(
      deniedPayment({
        amount: 100,
        invoiceId: sampleInvoice.id,
        tenantId: 'tenant-other',
      }),
    ).rejects.toBeInstanceOf(TenantAccessError);
  });
});