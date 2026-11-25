'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useMemo, useState, useSyncExternalStore } from 'react';

import { BrandedDocumentPreview } from '@/components/tenant/brandedDocumentPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormActions, FormField } from '@/components/forms';
import {
  applyTenantBranding,
  getTenantBrandingServerSnapshot,
  getTenantBrandingSnapshot,
  resetTenantBranding,
  saveTenantBranding,
  subscribeToTenantBranding,
} from '@/lib/tenantBranding';
import type { TenantBranding, TenantBrandingField } from '@/types/tenantBranding';
// import { defaultTenantBranding } from '@/types/tenantBranding';

export function TenantBrandingSettings() {
  const snapshot = useSyncExternalStore(
    subscribeToTenantBranding,
    getTenantBrandingSnapshot,
    getTenantBrandingServerSnapshot,
  );
  const storedBranding = useMemo(() => JSON.parse(snapshot) as TenantBranding, [snapshot]);
  const [draftBranding, setDraftBranding] = useState<TenantBranding | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const branding = draftBranding ?? storedBranding;

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget;
    const field = name as TenantBrandingField;
    const nextBranding = { ...branding, [field]: value };

    setDraftBranding(nextBranding);

    if (field === 'primaryColor' || field === 'secondaryColor' || field === 'accentColor') {
      applyTenantBranding(nextBranding);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveTenantBranding(branding);

    try {
      const response = await fetch('/api/tenant-branding', {
        body: JSON.stringify(branding),
        headers: { 'content-type': 'application/json' },
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Branding API is not available yet.');
      }

      setStatusMessage('Tenant branding saved and applied to the app shell, quote preview, and invoice preview.');
    } catch {
      setStatusMessage('Tenant branding saved locally. It will sync to the tenant API once authentication is connected.');
    }
  };

  const handleReset = () => {
    resetTenantBranding();
    setDraftBranding(null);
    setStatusMessage('Tenant branding reset to the Blaze Diagnostics defaults.');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <Card>
        <CardHeader>
          <CardTitle>Tenant branding</CardTitle>
          <CardDescription>
            Configure the tenant logo, colors, business details, and document prefixes. These values are reflected immediately in the app shell and document previews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="businessName" label="Trading name">
                <Input
                  id="businessName"
                  name="businessName"
                  onChange={handleChange}
                  required
                  value={branding.businessName}
                />
              </FormField>
              <FormField id="legalName" label="Legal name">
                <Input
                  id="legalName"
                  name="legalName"
                  onChange={handleChange}
                  value={branding.legalName}
                />
              </FormField>
              <FormField id="businessEmail" label="Business email">
                <Input
                  id="businessEmail"
                  name="businessEmail"
                  onChange={handleChange}
                  type="email"
                  value={branding.businessEmail}
                />
              </FormField>
              <FormField id="businessPhone" label="Business phone">
                <Input
                  id="businessPhone"
                  name="businessPhone"
                  onChange={handleChange}
                  value={branding.businessPhone}
                />
              </FormField>
              <FormField id="taxNumber" label="Tax / VAT number">
                <Input
                  id="taxNumber"
                  name="taxNumber"
                  onChange={handleChange}
                  value={branding.taxNumber}
                />
              </FormField>
              <FormField id="logoUrl" label="Logo URL" description="Use a square transparent PNG/SVG where possible.">
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  onChange={handleChange}
                  placeholder="https://example.com/logo.svg"
                  type="url"
                  value={branding.logoUrl}
                />
              </FormField>
            </div>

            <FormField id="tradingAddress" label="Trading address">
              <textarea
                className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                id="tradingAddress"
                name="tradingAddress"
                onChange={handleChange}
                value={branding.tradingAddress}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-3">
              <ColorField
                id="primaryColor"
                label="Primary color"
                onChange={handleChange}
                value={branding.primaryColor}
              />
              <ColorField
                id="secondaryColor"
                label="Secondary color"
                onChange={handleChange}
                value={branding.secondaryColor}
              />
              <ColorField
                id="accentColor"
                label="Accent color"
                onChange={handleChange}
                value={branding.accentColor}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="quotePrefix" label="Quote prefix">
                <Input
                  id="quotePrefix"
                  name="quotePrefix"
                  onChange={handleChange}
                  value={branding.quotePrefix}
                />
              </FormField>
              <FormField id="invoicePrefix" label="Invoice prefix">
                <Input
                  id="invoicePrefix"
                  name="invoicePrefix"
                  onChange={handleChange}
                  value={branding.invoicePrefix}
                />
              </FormField>
            </div>

            {statusMessage ? (
              <p aria-live="polite" className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                {statusMessage}
              </p>
            ) : null}

            <FormActions>
              <Button type="submit" variant="accent">Save branding</Button>
              <Button onClick={handleReset} type="button" variant="outline">Reset defaults</Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>

      <div className="grid content-start gap-6">
        <BrandSwatches branding={branding} />
        <BrandedDocumentPreview documentType="quote" />
        <BrandedDocumentPreview documentType="invoice" />
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  onChange,
  value,
}: {
  id: TenantBrandingField;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <FormField id={id} label={label}>
      <div className="flex gap-2">
        <Input
          aria-label={`${label} picker`}
          className="w-14 shrink-0 p-1"
          id={`${id}-picker`}
          name={id}
          onChange={onChange}
          type="color"
          value={value}
        />
        <Input id={id} name={id} onChange={onChange} value={value} />
      </div>
    </FormField>
  );
}

function BrandSwatches({ branding }: { branding: TenantBranding }) {
  return (
    <Card variant="muted">
      <CardHeader>
        <CardTitle>Color system</CardTitle>
        <CardDescription>Semantic tokens applied across cards, buttons, focus rings, quotes, and invoices.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Swatch color={branding.primaryColor} label="Primary" />
        <Swatch color={branding.secondaryColor} label="Secondary" />
        <Swatch color={branding.accentColor} label="Accent" />
      </CardContent>
    </Card>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="size-8 rounded-lg border border-border" style={{ background: color }} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <code className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{color}</code>
    </div>
  );
}
