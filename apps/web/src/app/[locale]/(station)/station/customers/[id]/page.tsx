import { AppShell } from '@/components/common/appShell';
import { CustomerDetail } from '@/components/customers/customerDetail';
import { PageSection } from '@/components/layout/pageSection';

export default async function StationCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell
      description="View customer profile, contact details, and linked records."
      surface="station"
      title="Customer Details"
    >
      <PageSection title="Customer profile">
        <CustomerDetail customerId={id} />
      </PageSection>
    </AppShell>
  );
}