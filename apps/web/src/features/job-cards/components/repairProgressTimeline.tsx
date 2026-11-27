'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import type {
  CustomerStatusEventInput,
  RepairProgressMilestone,
  TimelineStepState,
} from '../services/repairProgressTimeline';
import { buildCustomerRepairTimeline } from '../services/repairProgressTimeline';

export interface RepairProgressTimelineProps {
  jobCardId: string;
  initialEvents: readonly CustomerStatusEventInput[];
  subscribeToEvents?: (
    jobCardId: string,
    onUpdate: (events: CustomerStatusEventInput[]) => void,
  ) => (() => void) | void;
  className?: string;
  emptyMessage?: string;
  locale?: string;
}

const STATE_BADGE_STYLES: Record<TimelineStepState, string> = {
  completed: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
  current: 'bg-sky-500/15 text-sky-900 border-sky-500/30',
  delayed: 'bg-amber-500/15 text-amber-900 border-amber-500/30',
  pending: 'bg-muted text-muted-foreground border-border',
};

const STATE_LABELS: Record<TimelineStepState, string> = {
  completed: 'Completed',
  current: 'Current step',
  delayed: 'Delayed',
  pending: 'Pending',
};

function MilestoneRow({ milestone }: { milestone: RepairProgressMilestone }) {
  return (
    <li
      aria-current={milestone.isCurrent ? 'step' : undefined}
      className="relative border-l-2 border-border pb-6 pl-5 last:pb-0"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-background',
          milestone.state === 'completed' && 'bg-emerald-600',
          milestone.state === 'current' && 'bg-sky-600',
          milestone.state === 'delayed' && 'bg-amber-600',
          milestone.state === 'pending' && 'bg-muted-foreground',
        )}
      />

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{milestone.label}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              STATE_BADGE_STYLES[milestone.state],
            )}
          >
            {STATE_LABELS[milestone.state]}
          </span>
        </div>

        {milestone.formattedDate && milestone.isoTimestamp ? (
          <time
            className="text-xs text-muted-foreground"
            dateTime={milestone.isoTimestamp}
          >
            {milestone.formattedDate}
          </time>
        ) : (
          <span className="text-xs text-muted-foreground">
            Timestamp pending
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {milestone.description}
      </p>
    </li>
  );
}

export function RepairProgressTimeline({
  jobCardId,
  initialEvents,
  subscribeToEvents,
  className,
  emptyMessage = 'No repair status updates recorded yet.',
  locale = 'en-ZA',
}: RepairProgressTimelineProps) {
  const [events, setEvents] = useState<readonly CustomerStatusEventInput[]>(
    initialEvents,
  );
  const [prevInitialEvents, setPrevInitialEvents] =
    useState<readonly CustomerStatusEventInput[]>(initialEvents);

  if (initialEvents !== prevInitialEvents) {
    setPrevInitialEvents(initialEvents);
    setEvents(initialEvents);
  }

  useEffect(() => {
    if (!subscribeToEvents) return;
    return subscribeToEvents(jobCardId, (nextEvents) => {
      setEvents(nextEvents);
    });
  }, [jobCardId, subscribeToEvents]);

  const timeline = buildCustomerRepairTimeline({
    jobCardId,
    events,
    locale,
  });

  return (
    <section
      aria-label="Repair progress timeline"
      className={cn(
        'rounded-xl border border-border bg-card p-4 text-card-foreground',
        className,
      )}
      data-journey-kind={timeline.journeyKind}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          Repair progress
        </h2>
        <span className="text-xs text-muted-foreground">
          Journey: {timeline.journeyKind}
        </span>
      </div>

      {timeline.milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {timeline.milestones.map((milestone) => (
            <MilestoneRow key={milestone.id} milestone={milestone} />
          ))}
        </ol>
      )}
    </section>
  );
}