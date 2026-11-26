import { describe, expect, it, vi } from 'vitest';

import { allocateInvoiceNumber, formatInvoiceNumber } from './invoiceNumbering';

describe('formatInvoiceNumber', () => {
  it('pads the sequence to 4 digits', () => {
    expect(formatInvoiceNumber('INV', 2026, 1)).toBe('INV-2026-0001');
    expect(formatInvoiceNumber('INV', 2026, 42)).toBe('INV-2026-0042');
  });

  it('keeps numbers longer than 4 digits whole', () => {
    expect(formatInvoiceNumber('INV', 2026, 12345)).toBe('INV-2026-12345');
  });
});

describe('allocateInvoiceNumber', () => {
  // A fake transaction whose insert...onConflictDoUpdate...returning gives back lastNumber.
  function fakeTx(lastNumber: number) {
    const returning = vi.fn(() => Promise.resolve([{ lastNumber }]));
    const onConflictDoUpdate = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const tx = { insert: vi.fn(() => ({ values })) };
    return { onConflictDoUpdate, tx, values };
  }

  it('takes the next number for the tenant and year', async () => {
    const { tx, values } = fakeTx(7);

    const number = await allocateInvoiceNumber(
      tx as never,
      'tenant-1',
      new Date('2026-11-18T10:00:00Z'),
    );

    expect(number).toBe('INV-2026-0007');
    expect(values).toHaveBeenCalledWith({
      lastNumber: 1,
      tenantId: 'tenant-1',
      year: 2026,
    });
  });

  it('increments the existing counter when the tenant already has one this year', async () => {
    const { onConflictDoUpdate, tx } = fakeTx(2);

    await allocateInvoiceNumber(
      tx as never,
      'tenant-1',
      new Date('2026-11-18T10:00:00Z'),
    );

    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.any(Object),
        target: expect.any(Array),
      }),
    );
  });

  it('uses a custom prefix', async () => {
    const { tx } = fakeTx(3);

    const number = await allocateInvoiceNumber(
      tx as never,
      'tenant-1',
      new Date('2027-01-05T10:00:00Z'),
      'BLZ',
    );

    expect(number).toBe('BLZ-2027-0003');
  });
});
