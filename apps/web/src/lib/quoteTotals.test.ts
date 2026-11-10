import { describe, expect, it } from 'vitest';

import type { QuoteLineItemDraft } from '@/types/quotes';
import { calculateQuoteLineTotals, calculateQuoteTotals } from './quoteTotals';

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

describe('BD-025: rounding and edge cases', () => {
  it('charges 15% VAT on 2 x R100', () => {
    expect(calculateQuoteLineTotals({ ...baseLineItem, quantity: 2 })).toEqual({
      discount: 0,
      lineTotal: 230,
      subtotal: 200,
      tax: 30,
    });
  });

  it('caps a discount that is larger than the line subtotal', () => {
    expect(
      calculateQuoteLineTotals({
        ...baseLineItem,
        discount: 80,
        unitPrice: 50,
      }),
    ).toEqual({ discount: 50, lineTotal: 0, subtotal: 50, tax: 0 });
  });

  it('charges no VAT on a 0% line', () => {
    expect(calculateQuoteLineTotals({ ...baseLineItem, taxRate: 0 })).toEqual({
      discount: 0,
      lineTotal: 100,
      subtotal: 100,
      tax: 0,
    });
  });

  it('returns zero for a zero quantity', () => {
    expect(calculateQuoteLineTotals({ ...baseLineItem, quantity: 0 })).toEqual({
      discount: 0,
      lineTotal: 0,
      subtotal: 0,
      tax: 0,
    });
  });

  it('handles fractional labour hours (1.5 x R450)', () => {
    expect(
      calculateQuoteLineTotals({
        ...baseLineItem,
        category: 'labor',
        quantity: 1.5,
        unitPrice: 450,
      }),
    ).toEqual({ discount: 0, lineTotal: 776.25, subtotal: 675, tax: 101.25 });
  });

  it('rounds VAT of R8.9955 on 3 x R19.99 up to R9.00', () => {
    expect(
      calculateQuoteLineTotals({
        ...baseLineItem,
        quantity: 3,
        unitPrice: 19.99,
      }),
    ).toEqual({ discount: 0, lineTotal: 68.97, subtotal: 59.97, tax: 9 });
  });

  it('treats NaN and Infinity quantities as zero', () => {
    const zero = { discount: 0, lineTotal: 0, subtotal: 0, tax: 0 };

    expect(
      calculateQuoteLineTotals({ ...baseLineItem, quantity: Number.NaN }),
    ).toEqual(zero);
    expect(
      calculateQuoteLineTotals({
        ...baseLineItem,
        quantity: Number.POSITIVE_INFINITY,
      }),
    ).toEqual(zero);
  });

  it('keeps cents exact on large amounts (1000 x R99,999.99)', () => {
    expect(
      calculateQuoteLineTotals({
        ...baseLineItem,
        quantity: 1000,
        unitPrice: 99999.99,
      }),
    ).toEqual({
      discount: 0,
      lineTotal: 114999988.5,
      subtotal: 99999990,
      tax: 14999998.5,
    });
  });

  it('treats the unit price as excluding VAT (R115 becomes R132.25)', () => {
    expect(
      calculateQuoteLineTotals({ ...baseLineItem, unitPrice: 115 }).lineTotal,
    ).toBe(132.25);
  });

  it.todo(
    'VAT-inclusive prices: waiting for the product lead to confirm the rule',
  );

  it('rounds VAT per line: 10 lines of R0.03 have no VAT', () => {
    const lines = Array.from({ length: 10 }, (_, index) => ({
      ...baseLineItem,
      id: `line-${index}`,
      unitPrice: 0.03,
    }));

    expect(calculateQuoteTotals(lines)).toEqual({
      discountTotal: 0,
      subtotal: 0.3,
      taxTotal: 0,
      total: 0.3,
    });
  });

  it('rounds half a cent up (0.5 x R8.03 = R4.015 -> R4.02)', () => {
    expect(
      calculateQuoteLineTotals({
        ...baseLineItem,
        quantity: 0.5,
        taxRate: 0,
        unitPrice: 8.03,
      }).subtotal,
    ).toBe(4.02);
  });

  it('rounds half a cent up (0.5 x R2.01 = R1.005 -> R1.01)', () => {
    expect(
      calculateQuoteLineTotals({
        ...baseLineItem,
        quantity: 0.5,
        taxRate: 0,
        unitPrice: 2.01,
      }).subtotal,
    ).toBe(1.01);
  });
});
