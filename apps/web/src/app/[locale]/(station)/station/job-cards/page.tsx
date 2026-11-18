import type { Route } from 'next';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

import { AppShell } from '@/components/common/appShell';
import {
  FeatureChecklist,
  FeatureMetricGrid,
  FeatureRecordList,
} from '@/components/common/featureDashboard';
import { Button } from '@/components/ui/button';
import { StaffingPanel } from '@/features/job-cards/components/staffingPanel';
import { stationChecklist, stationJobRecords } from '@/lib/sampleWorkflows';

export default function StationJobCardsPage() {
  return (
    <AppShell
      actions={
        <Button asChild variant="accent">
          <Link href={'/en/station/customers/new' as Route}>
            <PlusCircle className="size-4" />
            Start intake
          </Link>
        </Button>
      }
      description="Workshop job cards, assignments, blockers, diagnostics, and service status tracking."
      surface="station"
      title="Job cards"
    >
      <FeatureMetricGrid
        items={[
          { description: 'All active workshop jobs', label: 'Open jobs', value: '18' },
          { description: 'No mechanic assigned yet', label: 'Unassigned', value: '3' },
          { description: 'Parts or customer blockers', label: 'Blocked', value: '5' },
          { description: 'Ready for final review', label: 'Ready for QC', value: '4' },
        ]}
      />

      <FeatureRecordList
        description="A practical job queue that lets floor managers move work forward without relying on demo placeholders."
        items={stationJobRecords}
        title="Workshop action queue"
      />

      <FeatureChecklist
        description="These checks define the next production implementation work for job cards."
        items={stationChecklist}
        title="Job-card implementation checklist"
      />

      <StaffingPanel />
    </AppShell>
  );
}
