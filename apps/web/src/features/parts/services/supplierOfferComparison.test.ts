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
});