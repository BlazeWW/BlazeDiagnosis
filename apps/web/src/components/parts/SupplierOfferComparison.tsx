import type { NormalizedSupplierOffer } from '@/types/supplierOfferComparison';

type SupplierOfferComparisonProps = {
  offers: NormalizedSupplierOffer[];
};

function formatPrice(offer: NormalizedSupplierOffer) {
  if (offer.payableTotal === null) return 'Not confirmed';

  return `${offer.currencyCode ?? 'Currency unknown'} ${offer.payableTotal}`;
}

export function SupplierOfferComparison({
  offers,
}: SupplierOfferComparisonProps) {
  if (offers.length === 0) {
    return (
      <section aria-labelledby="supplier-comparison-title">
        <h2 id="supplier-comparison-title">Supplier offer comparison</h2>
        <p>No supplier offers are available for comparison.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="supplier-comparison-title">
      <h2 id="supplier-comparison-title">Supplier offer comparison</h2>
      <p>
        Only offers with confirmed compatible pricing, units, and quantities
        receive a rank.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Supplier offers, availability, delivery estimates, and comparison
            status
          </caption>
          <thead>
            <tr className="border-b">
              <th className="p-3" scope="col">Supplier</th>
              <th className="p-3" scope="col">Payable total</th>
              <th className="p-3" scope="col">Availability</th>
              <th className="p-3" scope="col">ETA</th>
              <th className="p-3" scope="col">Comparison</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => (
              <tr className="border-b align-top" key={offer.id}>
                <th className="p-3 font-medium" scope="row">
                  {offer.supplierName}
                </th>
                <td className="p-3">{formatPrice(offer)}</td>
                <td className="p-3">
                  {offer.items.length === 0 ? (
                    'No item details'
                  ) : (
                    <ul className="space-y-1">
                      {offer.items.map((item) => (
                        <li key={item.requestItemId}>
                          Item {item.requestItemId}: {item.availability}
                          {item.quantityAvailable === null
                            ? ', quantity unknown'
                            : `, quantity ${item.quantityAvailable}`}
                          {item.isAlternate ? ', alternate part' : ''}
                          {item.isAlternate && !item.fitmentVerified
                            ? ', fitment unverified'
                            : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="p-3">
                  {offer.eta
                    ? new Date(offer.eta).toLocaleString()
                    : 'Not supplied'}
                </td>
                <td className="p-3">
                  {offer.rankWithinCurrency === null ? (
                    <>
                      <strong>Not ranked</strong>
                      {offer.blockers.length > 0 && (
                        <ul className="mt-1 list-disc pl-5">
                          {offer.blockers.map((blocker) => (
                            <li key={blocker}>{blocker}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <strong>
                      Rank {offer.rankWithinCurrency} within {offer.currencyCode}
                    </strong>
                  )}
                  {offer.notices.length > 0 && (
                    <ul className="mt-1 list-disc pl-5">
                      {offer.notices.map((notice) => (
                        <li key={notice}>{notice}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}