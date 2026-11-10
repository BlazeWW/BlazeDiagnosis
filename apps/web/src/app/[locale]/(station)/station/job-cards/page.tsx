
import type { Route } from 'next';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

import { AppShell } from '@/components/common/appShell';
import {
  FeatureChecklist,
  FeatureMetricGrid,
  FeatureRecordList,
} from '@/components/common/featureDashboard';
import { DefectSeverityBadge } from '@/components/data-display/defectSeverityBadge';
import { Button } from '@/components/ui/button';
import {
  stationChecklist,
  stationInspectionFindings,
  stationJobRecords,
} from '@/lib/sampleWorkflows';

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
          {
            description: 'All active workshop jobs',
            label: 'Open jobs',
            value: '18',
          },
          {
            description: 'No mechanic assigned yet',
            label: 'Unassigned',
            value: '3',
          },
          {
            description: 'Parts or customer blockers',
            label: 'Blocked',
            value: '5',
          },
          {
            description: 'Ready for final review',
            label: 'Ready for QC',
            value: '4',
          },
        ]}
      />

      <FeatureRecordList
        description="A practical job queue that lets floor managers move work forward without relying on demo placeholders."
        items={stationJobRecords}
        title="Workshop action queue"
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Inspection findings
          </h2>
          <p className="text-sm text-muted-foreground">
            Example findings showing the available severity classifications.
          </p>
        </div>

        <div className="space-y-3">
          {stationInspectionFindings.map((finding) => (
            <div
              className="space-y-2 rounded-xl border border-border bg-card p-4"
              key={finding.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground">
                  {finding.title}
                </h3>
                <DefectSeverityBadge severity={finding.severity} />
              </div>

              <p className="text-sm text-muted-foreground">
                {finding.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <FeatureChecklist
        description="These checks define the next production implementation work for job cards."
        items={stationChecklist}
        title="Job-card implementation checklist"
      />
    </AppShell>
  );
}
