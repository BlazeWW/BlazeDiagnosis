import { describe, expect, it } from 'vitest';

import { tenantBrandingSchema } from './tenantBrandingSchema';

describe('tenantBrandingSchema', () => {
  it('accepts complete tenant branding settings', () => {
    expect(
      tenantBrandingSchema.parse({
        accentColor: '#22c55e',
        businessEmail: 'info@example.com',
        businessName: 'Blaze Demo Motors',
        invoicePrefix: 'INV',
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#111827',
        quotePrefix: 'QTE',
        secondaryColor: '#f97316',
      }),
    ).toMatchObject({
      businessName: 'Blaze Demo Motors',
      invoicePrefix: 'INV',
      quotePrefix: 'QTE',
    });
  });

  it('rejects invalid hex colors', () => {
    expect(() =>
      tenantBrandingSchema.parse({
        accentColor: 'green',
        businessName: 'Blaze Demo Motors',
        invoicePrefix: 'INV',
        primaryColor: '#111827',
        quotePrefix: 'QTE',
        secondaryColor: '#f97316',
      }),
    ).toThrow();
  });
});
