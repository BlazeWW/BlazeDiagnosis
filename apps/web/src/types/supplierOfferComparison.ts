export type RequestedComparisonItem = {
  id: string;
  quantity: string;
  unitCode: string | null;
};

export type SupplierComparisonItem = {
  requestItemId: string;
  quantityAvailable: string | null;
  unitCode: string | null;
  availability: 'available' | 'partial' | 'unavailable' | 'unknown';
  isAlternate: boolean;
  fitmentVerified: boolean;
};

export type SupplierComparisonOffer = {
  id: string;
  supplierName: string;
  currencyCode: string | null;
  payableTotal: string | null;
  taxAmount: string | null;
  taxTreatment: 'included' | 'additional' | null;
  deliveryFee: string | null;
  eta: string | null;
  items: SupplierComparisonItem[];
};

export type NormalizedSupplierOffer = SupplierComparisonOffer & {
  comparable: boolean;
  rankWithinCurrency: number | null;
  blockers: string[];
  notices: string[];
  payableMinorUnits: string | null;
};