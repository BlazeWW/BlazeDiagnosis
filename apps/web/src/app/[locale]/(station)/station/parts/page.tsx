import { SupplierOfferComparison } from '@/components/parts/SupplierOfferComparison';
import { compareSupplierOffers } from '@/features/parts/services/supplierOfferComparison';
import type { SupplierComparisonOffer } from '@/types/supplierOfferComparison';
import type { Route } from 'next';
import Link from 'next/link';
import { PackagePlus } from 'lucide-react';

import { AppShell } from '@/components/common/appShell';
import {
  FeatureChecklist,
  FeatureMetricGrid,
  FeatureRecordList,
} from '@/components/common/featureDashboard';
import { Button } from '@/components/ui/button';
import { stationChecklist, stationPartsRecords } from '@/lib/sampleWorkflows';

const requestedItems = [
  { id: 'request-item-1', quantity: '2', unitCode: 'each' },
];

const sampleOffers: SupplierComparisonOffer[] = [
  {
    id: 'offer-1',
    supplierName: 'Sample Supplier A',
    currencyCode: 'ZAR',
    payableTotal: '1250.00',
    taxAmount: '150.00',
    taxTreatment: 'included',
    deliveryFee: '50.00',
    eta: '2026-11-10T09:00:00.000Z',
    items: [
      {
        requestItemId: 'request-item-1',
        quantityAvailable: '2',
        unitCode: 'each',
        availability: 'available',
        isAlternate: false,
        fitmentVerified: true,
      },
    ],
  },
];

const comparison = compareSupplierOffers(requestedItems, sampleOffers);

export default function StationPartsPage() {
  return (
    <AppShell
      actions={
        <Button asChild variant="accent">
          <Link href={'/en/station/quotes/new' as Route}>
            <PackagePlus className="size-4" />
            Build quote
          </Link>
        </Button>
      }
      description="Parts requests, supplier responses, ETA tracking, compatible fitment, and delivery dependency visibility."
      surface="station"
      title="Parts"
    >
      <FeatureMetricGrid
        items={[
          { description: 'Sent to suppliers', label: 'Open requests', value: '7' },
          { description: 'Ready for comparison', label: 'Supplier responses', value: '5' },
          { description: 'Customer completion risk', label: 'Delayed ETAs', value: '2' },
          { description: 'Delivered today', label: 'Received parts', value: '4' },
        ]}
      />

      <FeatureRecordList
        description="Stations can see compatible parts, compare supplier responses, and identify ETA risks that affect customers."
        items={stationPartsRecords}
        title="Parts workflow queue"
      />

      <FeatureChecklist
        description="Next work should connect this queue to vehicle fitment, supplier responses, and delivery status events."
        items={stationChecklist}
        title="Parts implementation checklist"
      />
      <SupplierOfferComparison offers={comparison} />
    </AppShell>
  );
}
