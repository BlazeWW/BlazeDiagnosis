'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatMoney } from '@/lib/formatting/money';
import {
  getTenantBrandingServerSnapshot,
  getTenantBrandingSnapshot,
  subscribeToTenantBranding,
} from '@/lib/tenantBranding';
import type { TenantBranding } from '@/types/tenantBranding';

export type BrandedDocumentPreviewItem = {
  description: string;
  quantity: number;
  totalCents: number;
  unitPriceCents: number;
};

export type BrandedDocumentPreviewProps = {
  documentType?: 'quote' | 'invoice';
  items?: BrandedDocumentPreviewItem[];
  reference?: string;
  status?: string;
  title?: string;
  total?: number;
  totalCents?: number;
};

export function BrandedDocumentPreview({
  documentType = 'quote',
  items = [],
  reference,
  status,
  title,
  total = 2242.5,
  totalCents,
}: BrandedDocumentPreviewProps) {
  const snapshot = useSyncExternalStore(
    subscribeToTenantBranding,
    getTenantBrandingSnapshot,
    getTenantBrandingServerSnapshot,
  );
  const branding = useMemo(() => JSON.parse(snapshot) as TenantBranding, [snapshot]);
  const documentNumber =
    reference ??
    (documentType === 'quote'
      ? `${branding.quotePrefix}-2026-0001`
      : `${branding.invoicePrefix}-2026-0001`);
  const documentTotal = totalCents === undefined ? total : totalCents / 100;
  const subtotal = documentTotal / 1.15;
  const tax = documentTotal - subtotal;

  return (
    <Card variant="panel">
      <CardHeader>
        <CardTitle>Branded {documentType} preview</CardTitle>
        <CardDescription>
          This preview uses the tenant branding that will be applied to generated quotes and invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div
            className="flex flex-col gap-4 p-5 text-primary-foreground dark:text-white sm:flex-row sm:items-center sm:justify-between"
            style={{ background: branding.primaryColor }}
          >
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`${branding.businessName} logo`}
                  className="size-12 rounded-xl bg-white object-contain p-2"
                  src={branding.logoUrl}
                />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-xl bg-white/15 text-base font-black">
                  {branding.businessName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div>
                <h3 className="text-lg font-bold">{branding.businessName}</h3>
                <p className="text-sm opacity-85">{branding.legalName}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-75">
                {documentType}
              </p>
              <p className="font-mono text-lg font-bold">{documentNumber}</p>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="space-y-1 text-sm text-muted-foreground dark:text-white/80">
              <p className="font-semibold text-foreground dark:text-white">Tenant details</p>
              <p>{branding.tradingAddress}</p>
              <p>{branding.businessPhone}</p>
              <p>{branding.businessEmail}</p>
              <p>{branding.taxNumber}</p>
              {title ? (
                <p className="pt-3 font-semibold text-foreground dark:text-white">{title}</p>
              ) : null}
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground dark:text-white/80">Status</span>
                <StatusBadge tone={documentType === 'quote' ? 'warning' : 'success'}>
                  {status ?? (documentType === 'quote' ? 'Draft' : 'Ready')}
                </StatusBadge>
              </div>
              {items.length > 0 ? (
                <div className="space-y-2 border-y border-border py-3">
                  {items.map((item) => (
                    <div className="flex items-start justify-between gap-3 text-xs" key={item.description}>
                      <span className="text-muted-foreground dark:text-white/80">
                        {item.quantity} × {item.description}
                      </span>
                      <span className="font-mono text-foreground dark:text-white">
                        {formatMoney(item.totalCents / 100)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 text-sm dark:text-white">
                <span className="text-muted-foreground dark:text-white/80">Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm dark:text-white">
                <span className="text-muted-foreground dark:text-white/80">Tax</span>
                <span>{formatMoney(tax)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-base font-bold dark:text-white">
                <span>Total</span>
                <span>{formatMoney(documentTotal)}</span>
              </div>
            </div>
          </div>

          <div className="h-2" style={{ background: branding.accentColor }} />
        </article>
      </CardContent>
    </Card>
  );
}
