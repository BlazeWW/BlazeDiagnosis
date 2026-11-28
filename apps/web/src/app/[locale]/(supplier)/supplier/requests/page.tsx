import { AppShell } from '@/components/common/appShell';
import { SupplierResponseForm } from '@/components/forms/supplierResponseForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Fixture values pending the supplier-facing requests list endpoint.
// Replace with real values when GET /api/supplier/requests is implemented.
const DEMO_REQUEST = {
  partsRequestId: '11111111-1111-4111-8111-111111111111',
  partId: '22222222-2222-4222-8222-222222222222',
  partName: 'Brake pads (demo)',
  supplierId: '33333333-3333-4333-8333-333333333333',
};

export default function SupplierRequestsPage() {
  return (
    <AppShell
      description="Incoming station parts requests that need price, stock, and delivery confirmation."
      surface="supplier"
      title="Supplier requests"
    >
      <Card>
        <CardHeader>
          <CardTitle>Respond to request</CardTitle>
          <CardDescription>
            Submit price, quantity, availability, and ETA for the requested part.
            The full request queue (multiple items per station request) is a
            follow-up task once the supplier-facing list endpoint is available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupplierResponseForm
            partId={DEMO_REQUEST.partId}
            partName={DEMO_REQUEST.partName}
            partsRequestId={DEMO_REQUEST.partsRequestId}
            supplierId={DEMO_REQUEST.supplierId}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}