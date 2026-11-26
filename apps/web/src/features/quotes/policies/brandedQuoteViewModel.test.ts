import { describe, expect, it } from 'vitest';
import type { TenantBranding } from '@/types/tenantBranding';
import {
  createBrandedQuoteViewModel,
  type BrandedQuoteSource,
} from './brandedQuoteViewModel';

const sampleBranding: TenantBranding = {
  businessName: 'Highveld Auto Bay',
  legalName: 'Highveld Auto Bay (Pty) Ltd',
  businessEmail: 'quotes@example.test',
  businessPhone: '+27 51 000 0000',
  taxNumber: '4000000000',
  logoUrl: 'https://example.test/logo.png',
  tradingAddress: '12 Sample Street\nBloemfontein',
  primaryColor: '#1e293b',
  secondaryColor: '#475569',
  accentColor: '#2563eb',
  quotePrefix: 'QT-',
  invoicePrefix: 'INV-',
};

const sampleQuote: BrandedQuoteSource = {
  quoteNumber: 'QT-2026-0118',
  issuedAt: '2026-11-25',
  validUntil: '2026-12-10',
  customerName: 'Sample Fleet Account',
  customerReference: 'CUST-101',
  jobCardReference: 'JC-88',
  customerNotes: 'Valid for 14 days.',
  internalNotes: 'SECRET_INTERNAL_NOTE',
  supplierMarginTotal: 999.99,
  costPriceTotal: 500,
  approvalOverrideReason: 'SECRET_OVERRIDE',
  lineItems: [
    {
      id: 'line-1',
      approvalRequirement: 'recommended',
      category: 'labor',
      description: 'Diagnostic inspection and brake service',
      discount: 0,
      quantity: 1.5,
      taxRate: 15,
      unitPrice: 450,
      supplierCost: 200,
      marginPercent: 55,
      internalNote: 'SECRET_LINE_NOTE',
    },
  ],
};

describe('createBrandedQuoteViewModel', () => {
  it('produces identical output for the same fixture', () => {
    const first = createBrandedQuoteViewModel(sampleQuote, sampleBranding, { locale: 'en-ZA' });
    const second = createBrandedQuoteViewModel(sampleQuote, sampleBranding, { locale: 'en-ZA' });

    expect(second).toEqual(first);
  });

  it('excludes internal notes, margin, and supplier cost fields', () => {
    const model = createBrandedQuoteViewModel(sampleQuote, sampleBranding, { locale: 'en-ZA' });
    const serialized = JSON.stringify(model);

    expect(serialized).not.toContain('SECRET_INTERNAL_NOTE');
    expect(serialized).not.toContain('SECRET_LINE_NOTE');
    expect(serialized).not.toContain('SECRET_OVERRIDE');
    expect(serialized).not.toContain('supplierMarginTotal');
    expect(serialized).not.toContain('supplierCost');
    expect(serialized).not.toContain('marginPercent');
    expect(serialized).not.toContain('internalNotes');
    expect(serialized).not.toContain('costPriceTotal');
    expect(model.customerNotes).toBe('Valid for 14 days.');
  });

  it('handles missing logoUrl and long line item descriptions safely', () => {
    const longDescription = 'Brake rotor machining and caliper alignment check '.repeat(6).trim();
    const model = createBrandedQuoteViewModel(
      {
        ...sampleQuote,
        lineItems: [
          {
            ...sampleQuote.lineItems[0]!,
            description: longDescription,
          },
        ],
      },
      {
        ...sampleBranding,
        logoUrl: '',
      },
      { locale: 'en-ZA' },
    );

    expect(model.branding.logoUrl).toBeNull();
    expect(model.lineItems[0]?.description).toBe(longDescription);
    expect(model.totals.grandTotalText).toBeTruthy();
  });
});