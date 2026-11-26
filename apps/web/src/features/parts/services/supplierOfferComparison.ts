import type {
  NormalizedSupplierOffer,
  RequestedComparisonItem,
  SupplierComparisonOffer,
} from '@/types/supplierOfferComparison';

function toMinorUnits(value: string | null): number | null {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value ?? '');

  if (!match) return null;

  return parseInt(match[1]) * 100 + parseInt((match[2] ?? '').padEnd(2, '0'));
}

export function compareSupplierOffers(
  requestedItems: RequestedComparisonItem[],
  offers: SupplierComparisonOffer[],
): NormalizedSupplierOffer[] {
  const normalized = offers.map((offer): NormalizedSupplierOffer => {
    const blockers: string[] = [];
    const notices: string[] = [];
    const total = toMinorUnits(offer.payableTotal);
    const tax = toMinorUnits(offer.taxAmount);
    const delivery = toMinorUnits(offer.deliveryFee);

    if (!offer.currencyCode || !/^[A-Z]{3}$/.test(offer.currencyCode)) {
      blockers.push('Currency is missing or invalid.');
    }
    if (total === null) blockers.push('Payable total is missing or invalid.');
    if (tax === null || !offer.taxTreatment) {
      blockers.push('Tax amount or tax treatment is missing.');
    }
    if (delivery === null) blockers.push('Delivery fee is missing or invalid.');
    if (!offer.eta) notices.push('ETA not supplied.');

    for (const requested of requestedItems) {
      const item = offer.items.find(
        (candidate) => candidate.requestItemId === requested.id,
      );

      if (!item) {
        blockers.push(`No response for requested item ${requested.id}.`);
        continue;
      }

      if (!requested.unitCode || !item.unitCode) {
        blockers.push(`Unit is missing for requested item ${requested.id}.`);
      } else if (requested.unitCode !== item.unitCode) {
        blockers.push(`Unit mismatch for requested item ${requested.id}.`);
      }

      const required = toMinorUnits(requested.quantity);
      const available = toMinorUnits(item.quantityAvailable);

      if (required === null || available === null || available < required) {
        blockers.push(`Insufficient or unknown quantity for item ${requested.id}.`);
      }

      if (item.availability === 'unavailable' || item.availability === 'unknown') {
        blockers.push(`Availability is not confirmed for item ${requested.id}.`);
      }

      if (item.isAlternate && !item.fitmentVerified) {
        blockers.push(`Alternate part fitment is unverified for item ${requested.id}.`);
      }
    }

    return {
      ...offer,
      comparable: blockers.length === 0,
      rankWithinCurrency: null,
      blockers,
      notices,
      payableMinorUnits: total?.toString() ?? null,
    };
  });

  const groups = new Map<string, NormalizedSupplierOffer[]>();

  for (const offer of normalized) {
    if (!offer.comparable || !offer.currencyCode) continue;

    const group = groups.get(offer.currencyCode) ?? [];
    group.push(offer);
    groups.set(offer.currencyCode, group);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    group.sort((left, right) => {
      const priceDifference =
        parseInt(left.payableMinorUnits!) - parseInt(right.payableMinorUnits!);

      if (priceDifference !== 0) return priceDifference < 0 ? -1 : 1;
      return left.supplierName.localeCompare(right.supplierName);
    });

    group.forEach((offer, index) => {
      offer.rankWithinCurrency = index + 1;
    });
  }

  return normalized;
}