import { AppShell } from '@/components/common/appShell';
import { VehicleDetail } from '@/components/vehicles/vehicleDetail';
import { PageSection } from '@/components/layout/pageSection';

export default async function StationVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell
      description="View vehicle details, service history, and odometer readings."
      surface="station"
      title="Vehicle Details"
    >
      <PageSection title="Vehicle details">
        <VehicleDetail vehicleId={id} />
      </PageSection>
    </AppShell>
  );
}