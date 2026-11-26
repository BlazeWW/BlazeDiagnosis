'use client';

import { useEffect, useState } from 'react';

import {
  FeatureMetricGrid,
  FeatureRecordList,
} from '@/components/common/featureDashboard';
import { fetchJobCards, fetchServiceRequests } from '@/lib/apiClient';
import type { FeatureMetric, FeatureRecord } from '@/types/featureDashboard';
import type { JobCardRecord, ServiceRequestRecord } from '@/types/jobCards';
import type { StatusTone } from '@/types/ui';

const closedStatuses = ['completed', 'cancelled'];
const blockedStatuses = ['awaiting_parts', 'awaiting_customer_approval'];

export function computeJobCardMetrics(jobCards: JobCardRecord[]): FeatureMetric[] {
  const open = jobCards.filter((j) => !closedStatuses.includes(j.internalStatus));

  return [
    {
      description: 'All active workshop jobs',
      label: 'Open jobs',
      value: String(open.length),
    },
    {
      description: 'No mechanic assigned yet',
      label: 'Unassigned',
      value: String(open.filter((j) => !j.assignedMechanicId).length),
    },
    {
      description: 'Waiting on parts or customer approval',
      label: 'Blocked',
      value: String(
        open.filter((j) => blockedStatuses.includes(j.internalStatus)).length,
      ),
    },
    {
      description: 'Ready for final review',
      label: 'Ready for QC',
      value: String(
        open.filter((j) => j.internalStatus === 'quality_control').length,
      ),
    },
  ];
}

const requestStatusDisplay: Record<
  ServiceRequestRecord['status'],
  { label: string; tone: StatusTone }
> = {
  cancelled: { label: 'Cancelled', tone: 'danger' },
  converted: { label: 'Converted to job card', tone: 'success' },
  draft: { label: 'Draft', tone: 'neutral' },
  received: { label: 'Received', tone: 'info' },
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toISOString().slice(0, 10);
}

export function toServiceRequestRecords(
  serviceRequests: ServiceRequestRecord[],
): FeatureRecord[] {
  return serviceRequests.map((request) => {
    const display = requestStatusDisplay[request.status];
    const meta = [
      `Received ${formatDate(request.createdAt)}`,
      request.preferredDate
        ? `Preferred ${formatDate(request.preferredDate)}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return {
      description: request.customerConcern ?? 'No customer concern recorded.',
      id: request.id,
      meta,
      status: display.label,
      statusTone: display.tone,
      title: request.requestedService,
    };
  });
}

export function JobCardOverviewView({
  error,
  jobCards,
  loading,
  serviceRequests,
}: {
  error: string | null;
  jobCards: JobCardRecord[];
  loading: boolean;
  serviceRequests: ServiceRequestRecord[];
}) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading job cards…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }

  return (
    <>
      <FeatureMetricGrid items={computeJobCardMetrics(jobCards)} />

      {serviceRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No service requests yet. Start an intake to create one.
        </p>
      ) : (
        <FeatureRecordList
          description="Tenant service requests, newest first."
          items={toServiceRequestRecords(serviceRequests)}
          title="Service request queue"
        />
      )}
    </>
  );
}

export function JobCardOverview() {
  const [jobCards, setJobCards] = useState<JobCardRecord[]>([]);
  const [serviceRequests, setServiceRequests] = useState<
    ServiceRequestRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [jobs, requests] = await Promise.all([
          fetchJobCards(),
          fetchServiceRequests(),
        ]);
        setJobCards(jobs.jobCards);
        setServiceRequests(requests.serviceRequests);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load job cards.',
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <JobCardOverviewView
      error={error}
      jobCards={jobCards}
      loading={loading}
      serviceRequests={serviceRequests}
    />
  );
}
