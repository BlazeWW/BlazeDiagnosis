import type { BrandedQuoteViewModel } from '../policies/brandedQuoteViewModel';

export interface BrandedQuoteDocumentProps {
  model: BrandedQuoteViewModel;
}

export function BrandedQuoteDocument({ model }: BrandedQuoteDocumentProps) {
  return (
    <article
      aria-label={`Quote ${model.quoteNumber}`}
      className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-8 text-slate-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <header
        className="flex flex-wrap items-start justify-between gap-6 border-b-2 pb-6"
        style={{ borderColor: model.branding.primaryColor }}
      >
        <div className="flex min-w-0 items-start gap-4">
          {model.branding.logoUrl ? (
            <img
              alt={`${model.branding.businessName} logo`}
              className="h-14 w-auto max-w-[180px] shrink-0 object-contain"
              src={model.branding.logoUrl}
            />
          ) : (
            <div
              className="flex h-12 shrink-0 items-center rounded border px-3 text-sm font-semibold"
              style={{
                borderColor: model.branding.accentColor,
                color: model.branding.primaryColor,
              }}
            >
              {model.branding.businessName}
            </div>
          )}

          <div className="min-w-0">
            <h1
              className="break-words text-2xl font-bold"
              style={{ color: model.branding.primaryColor }}
            >
              {model.branding.businessName}
            </h1>
            {model.branding.legalName ? (
              <p className="break-words text-xs text-slate-600">{model.branding.legalName}</p>
            ) : null}
            {model.branding.tradingAddress ? (
              <p className="mt-1 whitespace-pre-line break-words text-xs text-slate-600">
                {model.branding.tradingAddress}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {model.branding.businessEmail ? (
                <span className="break-all">{model.branding.businessEmail}</span>
              ) : null}
              {model.branding.businessPhone ? <span>{model.branding.businessPhone}</span> : null}
              {model.branding.taxNumber ? <span>VAT: {model.branding.taxNumber}</span> : null}
            </div>
          </div>
        </div>

        <div className="text-right text-sm">
          <div
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: model.branding.accentColor }}
          >
            Quotation
          </div>
          <div className="mt-1 font-mono text-base font-bold text-slate-900">
            {model.quoteNumber}
          </div>
          <div className="mt-1 text-slate-600">Issued: {model.issuedAt}</div>
          {model.validUntil ? (
            <div className="text-slate-600">Valid until: {model.validUntil}</div>
          ) : null}
        </div>
      </header>

      <section className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 break-inside-avoid">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Prepared For
        </h2>
        <p className="mt-1 break-words text-base font-semibold text-slate-900">
          {model.customer.name}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {model.customer.reference ? <span>Customer Ref: {model.customer.reference}</span> : null}
          {model.customer.jobCardReference ? (
            <span>Job Card: {model.customer.jobCardReference}</span>
          ) : null}
        </div>
      </section>

      <section className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr
              className="border-b text-xs uppercase tracking-wider"
              style={{
                borderColor: model.branding.primaryColor,
                color: model.branding.secondaryColor,
              }}
            >
              <th className="py-2.5 pr-4">Description</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5 text-right">Qty</th>
              <th className="px-3 py-2.5 text-right">Unit Price</th>
              <th className="py-2.5 pl-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {model.lineItems.map((line) => (
              <tr
                key={line.id}
                className="border-b border-slate-200 align-top break-inside-avoid"
              >
                <td className="py-3 pr-4 break-words">{line.description}</td>
                <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-600">
                  {line.categoryLabel}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">{line.quantity}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap">{line.unitPriceText}</td>
                <td className="py-3 pl-3 text-right font-medium whitespace-nowrap">
                  {line.lineTotalText}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex flex-col justify-between gap-6 break-inside-avoid sm:flex-row">
        <div className="min-w-0 flex-1">
          {model.customerNotes ? (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Customer Notes
              </h2>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">
                {model.customerNotes}
              </p>
            </>
          ) : null}
        </div>

        <dl className="w-full space-y-2 rounded-md border border-slate-200 bg-slate-50/70 p-4 text-sm sm:w-72">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="font-medium text-slate-900">{model.totals.subtotalText}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Discounts</dt>
            <dd className="font-medium text-slate-900">{model.totals.discountText}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">VAT</dt>
            <dd className="font-medium text-slate-900">{model.totals.taxText}</dd>
          </div>
          <div
            className="flex justify-between gap-4 border-t pt-2 text-base font-bold"
            style={{
              borderColor: model.branding.primaryColor,
              color: model.branding.primaryColor,
            }}
          >
            <dt>Total</dt>
            <dd>{model.totals.grandTotalText}</dd>
          </div>
        </dl>
      </section>
    </article>
  );
}