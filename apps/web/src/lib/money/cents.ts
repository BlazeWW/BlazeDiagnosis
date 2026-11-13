export const DEFAULT_VAT_RATE = 15;

export type MoneyInput = number | string | null | undefined;

export type LineInput = {
  discount?: MoneyInput;
  quantity: MoneyInput;
  taxRate?: MoneyInput;
  unitPrice: MoneyInput;
};

export type LineCents = {
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
};

export type DocumentTotalsCents = {
  discountTotal: number;
  subtotal: number;
  taxTotal: number;
  total: number;
};

/** R12.34 or '12.34' becomes 1234. Missing or invalid input becomes 0. */
export function toCents(value: MoneyInput): number {
  const amount =
    typeof value === 'string' ? Number(value.trim()) : Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.round(amount * 100);
}

/** 1234 becomes '12.34', the format the database stores. */
export function centsToString(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(
      `Expected a whole number of cents, received ${cents}.`,
    );
  }

  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const remainder = absolute % 100;
  const rand = (absolute - remainder) / 100;

  return `${sign}${rand}.${String(remainder).padStart(2, '0')}`;
}

/** Divides a non-negative whole number, rounding halves up: roundDiv(40150, 100) === 402. */
function roundDiv(numerator: number, divisor: number): number {
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError('Amount is too large to calculate safely.');
  }

  const remainder = numerator % divisor;
  const quotient = (numerator - remainder) / divisor;

  return remainder * 2 >= divisor ? quotient + 1 : quotient;
}

/** Subtotal, discount, VAT and total for one line, all in cents. */
export function calculateLineCents(line: LineInput): LineCents {
  const quantityHundredths = Math.max(0, toCents(line.quantity));
  const unitPriceCents = Math.max(0, toCents(line.unitPrice));
  const discountCents = Math.max(0, toCents(line.discount));
  const rateHundredths = Math.max(0, toCents(line.taxRate));

  const subtotal = roundDiv(quantityHundredths * unitPriceCents, 100);
  const discount = Math.min(discountCents, subtotal);
  const taxable = subtotal - discount;
  const tax = roundDiv(taxable * rateHundredths, 10000);

  return { discount, subtotal, tax, total: taxable + tax };
}

/** Totals for a whole quote or invoice. VAT is rounded per line. */
export function calculateDocumentTotals(
  lines: LineInput[],
): DocumentTotalsCents {
  return lines.map(calculateLineCents).reduce<DocumentTotalsCents>(
    (totals, line) => ({
      discountTotal: totals.discountTotal + line.discount,
      subtotal: totals.subtotal + line.subtotal,
      taxTotal: totals.taxTotal + line.tax,
      total: totals.total + line.total,
    }),
    { discountTotal: 0, subtotal: 0, taxTotal: 0, total: 0 },
  );
}
