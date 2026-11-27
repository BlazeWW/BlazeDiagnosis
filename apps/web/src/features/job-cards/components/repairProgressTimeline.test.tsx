import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { CustomerStatusEventInput } from '../services/repairProgressTimeline';
import { RepairProgressTimeline } from './repairProgressTimeline';

const SAMPLE_EVENTS: readonly CustomerStatusEventInput[] = [
  {
    id: 'evt-1',
    fromStatus: null,
    toStatus: 'request_received',
    createdAt: '2026-11-26T08:00:00.000Z',
  },
  {
    id: 'evt-2',
    fromStatus: 'request_received',
    toStatus: 'inspection_in_progress',
    createdAt: '2026-11-26T10:30:00.000Z',
  },
];

describe('RepairProgressTimeline', () => {
  it('renders an ordered list with aria-current on the active milestone and dateTime attributes', () => {
    const markup = renderToStaticMarkup(
      <RepairProgressTimeline
        initialEvents={SAMPLE_EVENTS}
        jobCardId="job-ui-1"
      />,
    );

    expect(markup).toContain('<ol');
    expect(markup).toContain('</ol>');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain('Request received');
    expect(markup).toContain('Inspection &amp; diagnostics');
    expect(markup).toContain('dateTime="2026-11-26T08:00:00.000Z"');
    expect(markup).toContain('dateTime="2026-11-26T10:30:00.000Z"');
    expect(markup).not.toContain('Invalid Date');
  });

  it('renders fallbacks for missing timestamps and empty event lists', () => {
    const undatedMarkup = renderToStaticMarkup(
      <RepairProgressTimeline
        initialEvents={[
          {
            id: 'evt-undated',
            fromStatus: null,
            toStatus: 'request_received',
            createdAt: null,
          },
        ]}
        jobCardId="job-ui-2"
      />,
    );

    expect(undatedMarkup).toContain('Timestamp pending');
    expect(undatedMarkup).not.toContain('Invalid Date');

    const emptyMarkup = renderToStaticMarkup(
      <RepairProgressTimeline
        emptyMessage="No updates yet."
        initialEvents={[]}
        jobCardId="job-ui-2"
      />,
    );

    expect(emptyMarkup).toContain('No updates yet.');
    expect(emptyMarkup).not.toContain('<ol');
  });

  it('reflects delayed journey state when the latest event is a delayed status', () => {
    const delayedMarkup = renderToStaticMarkup(
      <RepairProgressTimeline
        initialEvents={[
          ...SAMPLE_EVENTS,
          {
            id: 'evt-3',
            fromStatus: 'inspection_in_progress',
            toStatus: 'waiting_for_parts',
            createdAt: '2026-11-26T12:15:00.000Z',
          },
        ]}
        jobCardId="job-ui-3"
      />,
    );

    expect(delayedMarkup).toContain('data-journey-kind="delayed"');
    expect(delayedMarkup).toContain('Waiting for parts');
  });
});