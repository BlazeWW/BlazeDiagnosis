import { Suspense } from 'react';

import { AppShell } from '@/components/common/appShell';
import { FeatureChecklist } from '@/components/common/featureDashboard';
import {
  StationDashboardSections,
  StationDashboardSkeleton,
} from '@/features/reports/components/stationDashboardSections';
import { stationChecklist } from '@/lib/sampleWorkflows';

export const dynamic = 'force-dynamic';

export default async function StationDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AppShell
      description="Operational command centre for workshop queues, approvals, parts blockers, and invoicing."
      surface="station"
      title="Service-station dashboard"
    >
      <Suspense fallback={<StationDashboardSkeleton />}>
        <StationDashboardSections locale={locale} />
      </Suspense>

      <FeatureChecklist
        description="The dashboard is now a functional entry point while the production data layer is connected."
        items={stationChecklist}
        title="Station production checklist"
      />
    </AppShell>
  );
}
