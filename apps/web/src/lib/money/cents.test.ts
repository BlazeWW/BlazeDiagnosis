import { describe, expect, it } from 'vitest';

import {
  calculateDocumentTotals,
  calculateLineCents,
  centsToString,
  toCents,
} from './cents';

describe('toCents', () => {
  it('converts rand numbers and database strings to whole cents', () => {
    expect(toCents(12.34)).toBe(1234);
    expect(toCents('12.34')).toBe(1234);
    expect(toCents(8.03)).toBe(803);
    expect(toCents(' 0.10 ')).toBe(10);
  });

  it('treats missing or invalid input as zero', () => {
    expect(toCents(null)).toBe(0);
    expect(toCents(undefined)).toBe(0);
    expect(toCents('abc')).toBe(0);
    expect(toCents(Number.NaN)).toBe(0);
    expect(toCents(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('centsToString', () => {
  it('formats cents the way the database stores money', () => {
    expect(centsToString(0)).toBe('0.00');
    expect(centsToString(5)).toBe('0.05');
    expect(centsToString(1230)).toBe('12.30');
    expect(centsToString(123456)).toBe('1234.56');
    expect(centsToString(999999999999)).toBe('9999999999.99');
  });

  it('refuses fractions of a cent', () => {
    expect(() => centsToString(1.5)).toThrow(RangeError);
  });

  it('formats negative amounts with a minus sign', () => {
    expect(centsToString(-1230)).toBe('-12.30');
    expect(centsToString(-5)).toBe('-0.05');
  });
});

describe('calculateLineCents', () => {
  it('charges 15% VAT on 2 x R100', () => {
    expect(
      calculateLineCents({ quantity: 2, taxRate: 15, unitPrice: 100 }),
    ).toEqual({
      discount: 0,
      subtotal: 20000,
      tax: 3000,
      total: 23000,
    });
  });

  it('applies the discount before VAT (2 x R100, R10 off)', () => {
    expect(
      calculateLineCents({
        discount: 10,
        quantity: 2,
        taxRate: 15,
        unitPrice: 100,
      }),
    ).toEqual({ discount: 1000, subtotal: 20000, tax: 2850, total: 21850 });
  });

  it('caps a discount that is larger than the line', () => {
    expect(
      calculateLineCents({
        discount: 80,
        quantity: 1,
        taxRate: 15,
        unitPrice: 50,
      }),
    ).toEqual({ discount: 5000, subtotal: 5000, tax: 0, total: 0 });
  });

  it('charges no VAT at 0%', () => {
    expect(
      calculateLineCents({ quantity: 1, taxRate: 0, unitPrice: 100 }),
    ).toEqual({
      discount: 0,
      subtotal: 10000,
      tax: 0,
      total: 10000,
    });
  });

  it('handles fractional labour hours (1.5 x R450)', () => {
    expect(
      calculateLineCents({ quantity: 1.5, taxRate: 15, unitPrice: 450 }),
    ).toEqual({
      discount: 0,
      subtotal: 67500,
      tax: 10125,
      total: 77625,
    });
  });

  it('rounds VAT of 899.55 cents up to 900 (3 x R19.99)', () => {
    expect(
      calculateLineCents({ quantity: 3, taxRate: 15, unitPrice: 19.99 }),
    ).toEqual({
      discount: 0,
      subtotal: 5997,
      tax: 900,
      total: 6897,
    });
  });

  it('rounds half a cent up', () => {
    expect(
      calculateLineCents({ quantity: 0.5, taxRate: 0, unitPrice: 8.03 })
        .subtotal,
    ).toBe(402);
    expect(
      calculateLineCents({ quantity: 0.5, taxRate: 0, unitPrice: 2.01 })
        .subtotal,
    ).toBe(101);
  });

  it('keeps large amounts exact (1000 x R99,999.99)', () => {
    expect(
      calculateLineCents({ quantity: 1000, taxRate: 15, unitPrice: 99999.99 }),
    ).toEqual({
      discount: 0,
      subtotal: 9999999000,
      tax: 1499999850,
      total: 11499998850,
    });
  });

  it('accepts the strings the database returns', () => {
    expect(
      calculateLineCents({
        discount: '10.00',
        quantity: '2',
        taxRate: '15.00',
        unitPrice: '100.00',
      }),
    ).toEqual({ discount: 1000, subtotal: 20000, tax: 2850, total: 21850 });
  });

  it('treats negative input as zero', () => {
    expect(
      calculateLineCents({
        discount: -5,
        quantity: -2,
        taxRate: -15,
        unitPrice: 100,
      }),
    ).toEqual({ discount: 0, subtotal: 0, tax: 0, total: 0 });
  });

  it('throws instead of losing precision on absurd amounts', () => {
    expect(() =>
      calculateLineCents({ quantity: 1e10, unitPrice: 1e10 }),
    ).toThrow(RangeError);
  });
});

describe('calculateDocumentTotals', () => {
  it('returns zero for no lines', () => {
    expect(calculateDocumentTotals([])).toEqual({
      discountTotal: 0,
      subtotal: 0,
      taxTotal: 0,
      total: 0,
    });
  });

  it('rounds VAT per line (10 lines of R0.03 have no VAT)', () => {
    const lines = Array.from({ length: 10 }, () => ({
      quantity: 1,
      taxRate: 15,
      unitPrice: 0.03,
    }));

    expect(calculateDocumentTotals(lines)).toEqual({
      discountTotal: 0,
      subtotal: 30,
      taxTotal: 0,
      total: 30,
    });
  });

  it('adds up mixed lines', () => {
    expect(
      calculateDocumentTotals([
        { discount: 10, quantity: 2, taxRate: 15, unitPrice: 100 },
        { quantity: 1.5, taxRate: 15, unitPrice: 450 },
      ]),
    ).toEqual({
      discountTotal: 1000,
      subtotal: 87500,
      taxTotal: 12975,
      total: 99475,
    });
  });
});
