import { describe, expect, it } from 'vitest';

import { calculateQuoteLineTotals, calculateQuoteTotals } from './quoteTotals';
import type { QuoteLineItemDraft } from '@/types/quotes';

const baseLineItem: QuoteLineItemDraft = {
  approvalRequirement: 'recommended',
  category: 'part',
  description: 'Brake pads',
  discount: 0,
  id: 'line-1',
  quantity: 1,
  taxRate: 15,
  unitPrice: 100,
};

describe('calculateQuoteLineTotals', () => {
  it('calculates subtotal, tax, discount, and total for a quote line', () => {
    expect(
      calculateQuoteLineTotals({ ...baseLineItem, discount: 10, quantity: 2 }),
    ).toEqual({
      discount: 10,
      lineTotal: 218.5,
      subtotal: 200,
      tax: 28.5,
    });
  });

  it('clamps negative values and over-discounts safely', () => {
    expect(
      calculateQuoteLineTotals({
        ...baseLineItem,
        discount: 500,
        quantity: -2,
        taxRate: -15,
        unitPrice: -100,
      }),
    ).toEqual({
      discount: 0,
      lineTotal: 0,
      subtotal: 0,
      tax: 0,
    });
  });
});

describe('calculateQuoteTotals', () => {
  it('rolls up totals from multiple line items', () => {
    const totals = calculateQuoteTotals([
      { ...baseLineItem, quantity: 2, unitPrice: 100 },
      {
        ...baseLineItem,
        category: 'labor',
        description: 'Fitment labor',
        discount: 20,
        quantity: 1,
        taxRate: 15,
        unitPrice: 300,
      },
    ]);

    expect(totals).toEqual({
      discountTotal: 20,
      subtotal: 500,
      taxTotal: 72,
      total: 552,
    });
  });
});
