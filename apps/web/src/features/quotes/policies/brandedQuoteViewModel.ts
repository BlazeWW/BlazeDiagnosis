import type { TenantBranding } from '@/types/tenantBranding';
import type { QuoteLineItemDraft, QuoteTotals } from '@/types/quotes';
import { calculateQuoteLineTotals, calculateQuoteTotals } from '@/lib/quoteTotals';

export interface BrandedQuoteLineSource extends QuoteLineItemDraft {
  // Optional fields that must never appear in the branded quote document:
  supplierCost?: number;
  marginPercent?: number;
  internalNote?: string;
}

export interface BrandedQuoteSource {
  quoteNumber: string;
  issuedAt: string;
  validUntil?: string;
  customerName: string;
  customerReference?: string;
  jobCardReference?: string;
  customerNotes?: string;
  lineItems: BrandedQuoteLineSource[];
  // Optional internal/private fields that must never appear in the document:
  internalNotes?: string;
  supplierMarginTotal?: number;
  costPriceTotal?: number;
  approvalOverrideReason?: string;
}

export interface BrandedQuoteLineViewModel {
  id: string;
  description: string;
  categoryLabel: string;
  quantity: number;
  unitPriceText: string;
  subtotalText: string;
  discountText: string;
  taxText: string;
  lineTotalText: string;
}

export interface BrandedQuoteViewModel {
  documentId: string;
  quoteNumber: string;
  issuedAt: string;
  validUntil?: string;
  customer: {
    name: string;
    reference?: string;
    jobCardReference?: string;
  };
  branding: {
    businessName: string;
    legalName?: string;
    businessEmail?: string;
    businessPhone?: string;
    taxNumber?: string;
    tradingAddress?: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  lineItems: BrandedQuoteLineViewModel[];
  totals: {
    subtotalText: string;
    discountText: string;
    taxText: string;
    grandTotalText: string;
  };
  customerNotes?: string;
}

const DEFAULT_PRIMARY = '#111827';
const DEFAULT_SECONDARY = '#334155';
const DEFAULT_ACCENT = '#2563EB';
const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

const CATEGORY_LABELS: Record<string, string> = {
  part: 'Part',
  labor: 'Labor',
  diagnostic: 'Diagnostic',
  consumable: 'Consumable',
  optional_service: 'Optional Service',
};

function cleanOptionalString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeLogoUrl(logoUrl: string | null | undefined): string | null {
  const trimmed = logoUrl?.trim();
  return trimmed ? trimmed : null;
}

function normalizeHex(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && HEX_REGEX.test(trimmed) ? trimmed.toUpperCase() : fallback;
}

export function formatRand(amount: number, locale = 'en-ZA'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function createBrandedQuoteViewModel(
  quote: BrandedQuoteSource,
  branding: TenantBranding,
  options: { locale?: string; precomputedTotals?: QuoteTotals } = {},
): BrandedQuoteViewModel {
  const locale = options.locale ?? 'en-ZA';
  const quoteNumber = cleanOptionalString(quote.quoteNumber) ?? 'DRAFT-QUOTE';
  const issuedAt = cleanOptionalString(quote.issuedAt) ?? '';
  const validUntil = cleanOptionalString(quote.validUntil);
  const customerName = cleanOptionalString(quote.customerName) ?? 'Customer';
  const customerReference = cleanOptionalString(quote.customerReference);
  const jobCardReference = cleanOptionalString(quote.jobCardReference);
  const customerNotes = cleanOptionalString(quote.customerNotes);

  const computedTotals = options.precomputedTotals ?? calculateQuoteTotals(quote.lineItems);

  const lineItems: BrandedQuoteLineViewModel[] = quote.lineItems.map((item) => {
    const lineTotals = calculateQuoteLineTotals(item);
    const categoryKey = String(item.category);

    return {
      id: item.id,
      description: item.description.trim(),
      categoryLabel: CATEGORY_LABELS[categoryKey] ?? categoryKey,
      quantity: item.quantity,
      unitPriceText: formatRand(item.unitPrice, locale),
      subtotalText: formatRand(lineTotals.subtotal, locale),
      discountText: formatRand(lineTotals.discount, locale),
      taxText: formatRand(lineTotals.tax, locale),
      lineTotalText: formatRand(lineTotals.lineTotal, locale),
    };
  });

  const businessName = cleanOptionalString(branding.businessName) ?? 'Blaze Diagnostics';
  const legalName = cleanOptionalString(branding.legalName);
  const businessEmail = cleanOptionalString(branding.businessEmail);
  const businessPhone = cleanOptionalString(branding.businessPhone);
  const taxNumber = cleanOptionalString(branding.taxNumber);
  const tradingAddress = cleanOptionalString(branding.tradingAddress);

  return {
    documentId: `quote-doc:${quoteNumber}:${issuedAt}`,
    quoteNumber,
    issuedAt,
    ...(validUntil ? { validUntil } : {}),
    customer: {
      name: customerName,
      ...(customerReference ? { reference: customerReference } : {}),
      ...(jobCardReference ? { jobCardReference } : {}),
    },
    branding: {
      businessName,
      ...(legalName ? { legalName } : {}),
      ...(businessEmail ? { businessEmail } : {}),
      ...(businessPhone ? { businessPhone } : {}),
      ...(taxNumber ? { taxNumber } : {}),
      ...(tradingAddress ? { tradingAddress } : {}),
      logoUrl: normalizeLogoUrl(branding.logoUrl),
      primaryColor: normalizeHex(branding.primaryColor, DEFAULT_PRIMARY),
      secondaryColor: normalizeHex(branding.secondaryColor, DEFAULT_SECONDARY),
      accentColor: normalizeHex(branding.accentColor, DEFAULT_ACCENT),
    },
    lineItems,
    totals: {
      subtotalText: formatRand(computedTotals.subtotal, locale),
      discountText: formatRand(computedTotals.discountTotal, locale),
      taxText: formatRand(computedTotals.taxTotal, locale),
      grandTotalText: formatRand(computedTotals.total, locale),
    },
    ...(customerNotes ? { customerNotes } : {}),
  };
}