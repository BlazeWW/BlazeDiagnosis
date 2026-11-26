import type { Route } from 'next';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

import { AppShell } from '@/components/common/appShell';
import { FeatureChecklist } from '@/components/common/featureDashboard';
import { Button } from '@/components/ui/button';
import { JobCardOverview } from '@/features/job-cards/components/jobCardOverview';
import { JobWorkPanel } from '@/features/job-cards/components/jobWorkPanel';
import { StaffingPanel } from '@/features/job-cards/components/staffingPanel';
import type { FeatureChecklistItem } from '@/types/featureDashboard';

const jobCardChecklist: FeatureChecklistItem[] = [
  { completed: true, label: 'Replace demo data with tenant-aware job card and service request queries.' },
  { completed: true, label: 'Assign mechanics and floor managers from the staffing panel.' },
  { completed: false, label: 'Add status transition actions and timeline to each job card.' },
  { completed: false, label: 'Create service requests from the page instead of the intake flow.' },
];

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
      <JobCardOverview />

      <FeatureChecklist
        description="These checks define the next production implementation work for job cards."
        items={jobCardChecklist}
        title="Job-card implementation checklist"
      />

      <StaffingPanel />

      <JobWorkPanel />
    </AppShell>
  );
}
