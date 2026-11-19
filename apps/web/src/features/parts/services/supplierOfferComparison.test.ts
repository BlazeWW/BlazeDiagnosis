import { describe, expect, it } from 'vitest';

import { compareSupplierOffers } from './supplierOfferComparison';
import type { SupplierComparisonOffer } from '@/types/supplierOfferComparison';

const requestedItems = [
  { id: 'item-1', quantity: '2', unitCode: 'each' },
];

function offer(
  id: string,
  payableTotal: string,
  overrides: Partial<SupplierComparisonOffer> = {},
): SupplierComparisonOffer {
  return {
    id,
    supplierName: id,
    currencyCode: 'ZAR',
    payableTotal,
    taxAmount: '15.00',
    taxTreatment: 'additional',
    deliveryFee: '25.00',
    eta: '2026-11-10T09:00:00.000Z',
    items: [{
      requestItemId: 'item-1',
      quantityAvailable: '2',
      unitCode: 'each',
      availability: 'available',
      isAlternate: false,
      fitmentVerified: true,
    }],
    ...overrides,
  };
}

const ITEM = {
  requestItemId: 'item-1',
  quantityAvailable: '2',
  unitCode: 'each',
  availability: 'available' as const,
  isAlternate: false,
  fitmentVerified: true,
};

describe('compareSupplierOffers', () => {
  it('ranks comparable offers within the same currency', () => {
    const result = compareSupplierOffers(requestedItems, [
      offer('supplier-b', '1200.00'),
      offer('supplier-a', '1199.99'),
    ]);

    expect(result.map((item) => item.rankWithinCurrency)).toEqual([2, 1]);
  });

  it('does not rank an offer with a different unit', () => {
    const [result] = compareSupplierOffers(requestedItems, [
      offer('supplier-a', '1199.99', {
        items: [{
          requestItemId: 'item-1',
          quantityAvailable: '2',
          unitCode: 'set',
          availability: 'available',
          isAlternate: false,
          fitmentVerified: true,
        }],
      }),
    ]);

    expect(result.comparable).toBe(false);
    expect(result.rankWithinCurrency).toBeNull();
    expect(result.blockers).toContain('Unit mismatch for requested item item-1.');
  });

  it('does not rank an alternate part whose fitment is unverified', () => {
    const [result] = compareSupplierOffers(requestedItems, [
      offer('supplier-a', '900.00', {
        items: [{ ...ITEM, isAlternate: true, fitmentVerified: false }],
      }),
    ]);

    expect(result.comparable).toBe(false);
    expect(result.blockers).toContain(
      'Alternate part fitment is unverified for item item-1.',
    );
  });

  it('ranks an alternate part once its fitment is verified', () => {
    const result = compareSupplierOffers(requestedItems, [
      offer('supplier-a', '900.00', {
        items: [{ ...ITEM, isAlternate: true, fitmentVerified: true }],
      }),
      offer('supplier-b', '950.00'),
    ]);

    expect(result.map((item) => item.rankWithinCurrency)).toEqual([1, 2]);
  });

  it('does not rank an offer with less quantity than requested', () => {
    const result = compareSupplierOffers(requestedItems, [
      offer('supplier-a', '500.00', {
        items: [{ ...ITEM, quantityAvailable: '1' }],
      }),
      offer('supplier-b', '1200.00'),
    ]);

    expect(result[0].comparable).toBe(false);
    expect(result[0].blockers).toContain(
      'Insufficient or unknown quantity for item item-1.',
    );
    // A single comparable offer is not ranked as "best price".
    expect(result[1].rankWithinCurrency).toBeNull();
  });

  it('still ranks an offer with a missing ETA but flags it', () => {
    const result = compareSupplierOffers(requestedItems, [
      offer('supplier-a', '1000.00', { eta: null }),
      offer('supplier-b', '1100.00'),
    ]);

    expect(result[0].rankWithinCurrency).toBe(1);
    expect(result[0].notices).toContain('ETA not supplied.');
  });
});
