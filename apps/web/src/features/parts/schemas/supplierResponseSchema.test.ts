import { describe, expect, it } from 'vitest';
import { createSupplierResponseSchema } from './supplierResponseSchema';

const validPayload = {
  partsRequestId: '11111111-1111-4111-8111-111111111111',
  supplierId: '22222222-2222-4222-8222-222222222222',
  items: [
    {
      partId: '33333333-3333-4333-8333-333333333333',
      partName: 'Brake pads',
      quantityAvailable: 2,
      unitPrice: 450.5,
      availability: 'available',
    },
  ],
  subtotal: 901,
  tax: 135.15,
  total: 1036.15,
};

describe('createSupplierResponseSchema', () => {
  it('accepts a valid payload', () => {
    expect(createSupplierResponseSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects zero or negative quantityAvailable', () => {
    const payload = structuredClone(validPayload);
    payload.items[0].quantityAvailable = 0;
    expect(createSupplierResponseSchema.safeParse(payload).success).toBe(false);

    payload.items[0].quantityAvailable = -1;
    expect(createSupplierResponseSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects negative unitPrice', () => {
    const payload = structuredClone(validPayload);
    payload.items[0].unitPrice = -10;
    expect(createSupplierResponseSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects an unknown availability value', () => {
    const payload = structuredClone(validPayload);
    payload.items[0].availability = 'maybe';
    expect(createSupplierResponseSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects an eta in the past', () => {
    const payload = structuredClone(validPayload) as typeof validPayload & { eta?: string };
    payload.eta = '2020-01-01T00:00:00.000Z';
    expect(createSupplierResponseSchema.safeParse(payload).success).toBe(false);
  });

  it('rejects an item with empty partName', () => {
    const payload = structuredClone(validPayload);
    payload.items[0].partName = '';
    expect(createSupplierResponseSchema.safeParse(payload).success).toBe(false);
  });
});