import type { JobCustomerStatus } from './jobStatusRules';

export interface CustomerStatusEventInput {
  id: string;
  fromStatus: JobCustomerStatus | null;
  toStatus: JobCustomerStatus;
  createdAt: string | null;
}

export type TimelineStepState = 'completed' | 'current' | 'delayed' | 'pending';

export interface RepairProgressMilestone {
  id: string;
  status: JobCustomerStatus;
  label: string;
  description: string;
  state: TimelineStepState;
  isCurrent: boolean;
  isoTimestamp: string | null;
  formattedDate: string | null;
}

export interface RepairProgressTimelineResult {
  jobCardId: string;
  journeyKind: 'pending' | 'delayed' | 'completed';
  milestones: RepairProgressMilestone[];
}

export interface BuildTimelineOptions {
  jobCardId: string;
  events: readonly CustomerStatusEventInput[];
  ownerCustomerId?: string;
  viewerCustomerId?: string;
  locale?: string;
}

const MILESTONE_COPY: Record<
  JobCustomerStatus,
  { label: string; description: string; delayed?: boolean }
> = {
  request_received: {
    label: 'Request received',
    description: 'Your service request has been logged with the workshop.',
  },
  vehicle_checked_in: {
    label: 'Vehicle checked in',
    description: 'Your vehicle arrived at the service station and intake began.',
  },
  inspection_in_progress: {
    label: 'Inspection & diagnostics',
    description: 'Technicians are inspecting the vehicle and preparing findings.',
  },
  quote_ready: {
    label: 'Quote ready',
    description: 'Your repair quote has been prepared and is ready to view.',
  },
  awaiting_approval: {
    label: 'Awaiting your approval',
    description: 'A quote or repair estimate is waiting for your review.',
    delayed: true,
  },
  waiting_for_parts: {
    label: 'Waiting for parts',
    description: 'Repair progress is paused while replacement parts arrive.',
    delayed: true,
  },
  service_in_progress: {
    label: 'Repair in progress',
    description: 'Scheduled maintenance or repair work is underway.',
  },
  final_checks: {
    label: 'Final quality checks',
    description: 'Completed work is undergoing final safety and quality checks.',
  },
  invoice_ready: {
    label: 'Invoice ready',
    description: 'Your final service invoice is ready for review.',
  },
  ready_for_collection: {
    label: 'Ready for collection',
    description: 'Your vehicle is ready to be collected from the station.',
  },
  completed: {
    label: 'Completed',
    description: 'Service is complete and closed out.',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This service job was cancelled.',
  },
};

function parseValidTimestamp(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatSafeDate(
  isoString: string | null,
  locale = 'en-ZA',
): string | null {
  if (!isoString) return null;
  const parsed = Date.parse(isoString);
  if (Number.isNaN(parsed)) return null;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(parsed));
}

export function buildCustomerRepairTimeline(
  options: BuildTimelineOptions,
): RepairProgressTimelineResult {
  const {
    jobCardId,
    events,
    ownerCustomerId,
    viewerCustomerId,
    locale = 'en-ZA',
  } = options;

  if (
    ownerCustomerId !== undefined &&
    viewerCustomerId !== undefined &&
    ownerCustomerId !== viewerCustomerId
  ) {
    throw new Error('Customer ownership mismatch for repair timeline.');
  }

  const normalizedEvents = events
    .map((event, index) => {
      const ts = parseValidTimestamp(event.createdAt);
      const safeIso = ts !== null ? new Date(ts).toISOString() : null;
      return {
        event,
        index,
        ts,
        safeIso,
      };
    })
    .sort((a, b) => {
      if (a.ts !== null && b.ts !== null && a.ts !== b.ts) {
        return a.ts - b.ts;
      }
      if (a.ts !== null && b.ts === null) return -1;
      if (a.ts === null && b.ts !== null) return 1;
      return a.index - b.index;
    });

  const milestones: RepairProgressMilestone[] = normalizedEvents.map(
    ({ event, safeIso }, idx) => {
      const copy = MILESTONE_COPY[event.toStatus];
      const isLast = idx === normalizedEvents.length - 1;
      const isCompletedTerminal = event.toStatus === 'completed';

      let state: TimelineStepState = 'completed';
      if (isLast && !isCompletedTerminal) {
        state = copy.delayed ? 'delayed' : 'current';
      } else if (!isLast && copy.delayed) {
        state = 'completed';
      }

      return {
        id: event.id,
        status: event.toStatus,
        label: copy.label,
        description: copy.description,
        state,
        isCurrent: isLast && !isCompletedTerminal,
        isoTimestamp: safeIso,
        formattedDate: formatSafeDate(safeIso, locale),
      };
    },
  );

  const latest = milestones.at(-1);
  let journeyKind: RepairProgressTimelineResult['journeyKind'] = 'pending';
  if (!latest) {
    journeyKind = 'pending';
  } else if (latest.status === 'completed') {
    journeyKind = 'completed';
  } else if (latest.state === 'delayed') {
    journeyKind = 'delayed';
  }

  return {
    jobCardId,
    journeyKind,
    milestones,
  };
}