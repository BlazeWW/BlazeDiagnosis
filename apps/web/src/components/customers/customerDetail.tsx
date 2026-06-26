'use client';

import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import { EmptyState } from '@/components/data-display';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { fetchCustomerById, requestJson } from '@/lib/apiClient';
import type { Customer } from '@/types/customers';

interface CustomerDetailProps {
  customerId: string;
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<
    { id: string; title: string; status: string }[]
  >([]);

  // TODO : POD 3 API for quotes and integrate into customer detail.

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchCustomerById(customerId);
        setCustomer(data);

        // jobs fetch inside useEffect, fails silently
        try {
          const jobData = await requestJson<{
            jobs: { id: string; title: string; status: string }[];
          }>(`/api/jobs?customerId=${customerId}`, {
            errorMessage: 'Failed to load jobs.',
          });
          setJobs(jobData.jobs);
        } catch {
          // jobs endpoint may not exist yet, ignore
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Unable to load customer.',
        );
      } finally {
        setLoading(false);
      }
    };

    if (customerId) void loadCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Loading customer details...
        </CardContent>
      </Card>
    );
  }

  if (error || !customer) {
    return (
      <EmptyState
        description={error ?? 'The selected customer could not be found.'}
        title="Customer unavailable"
      />
    );
  }

  const fullName =
    `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() ||
    'Unnamed customer';

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{fullName}</CardTitle>
          <CardDescription>
            {customer.email ?? 'No email'} • {customer.phone ?? 'No phone'}
          </CardDescription>
        </div>
        <StatusBadge
          tone={customer.status === 'Pending' ? 'warning' : 'success'}
        >
          {customer.status ?? 'Active'}
        </StatusBadge>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="First name" value={customer.firstName ?? '—'} />
        <DetailItem label="Last name" value={customer.lastName ?? '—'} />
        <DetailItem label="Email" value={customer.email ?? '—'} />
        <DetailItem label="Phone" value={customer.phone ?? '—'} />
        <DetailItem label="Status" value={customer.status ?? 'Active'} />
      </CardContent>
      {jobs.length > 0 && (
        <CardContent className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jobs ({jobs.length})
          </p>
          <div className="grid gap-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-border bg-muted/40 p-3 text-sm"
              >
                <p className="font-medium">{job.title}</p>
                <p className="text-muted-foreground">{job.status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
