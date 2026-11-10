import { calculateDocumentTotals, calculateLineCents } from '@/lib/money/cents';
import type {
  QuoteLineItemDraft,
  QuoteLineTotals,
  QuoteTotals,
} from '@/types/quotes';

// Maths happens in whole cents (see lib/money/cents.ts). Dividing by 100 is only for display.
const centsToRand = (cents: number) => cents / 100;

export function calculateQuoteLineTotals(
  lineItem: QuoteLineItemDraft,
): QuoteLineTotals {
  const line = calculateLineCents(lineItem);

  return {
    discount: centsToRand(line.discount),
    lineTotal: centsToRand(line.total),
    subtotal: centsToRand(line.subtotal),
    tax: centsToRand(line.tax),
  };
}

export function calculateQuoteTotals(
  lineItems: QuoteLineItemDraft[],
): QuoteTotals {
  const totals = calculateDocumentTotals(lineItems);

  return {
    discountTotal: centsToRand(totals.discountTotal),
    subtotal: centsToRand(totals.subtotal),
    taxTotal: centsToRand(totals.taxTotal),
    total: centsToRand(totals.total),
  };
}
