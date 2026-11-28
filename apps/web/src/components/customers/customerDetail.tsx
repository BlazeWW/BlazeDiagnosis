'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import { EmptyState } from '@/components/data-display';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  fetchCustomerById,
  requestJson,
  updateCustomer,
} from '@/lib/apiClient';
import type { Customer } from '@/types/customers';

interface CustomerDetailProps {
  customerId: string;
}

type EditFormState = {
  email: string;
  firstName: string;
  lastName: string;
  notes: string;
  phone: string;
  preferredLocale: string;
};

function toFormState(customer: Customer): EditFormState {
  return {
    email: customer.email ?? '',
    firstName: customer.firstName ?? '',
    lastName: customer.lastName ?? '',
    notes: customer.notes ?? '',
    phone: customer.phone ?? '',
    preferredLocale: customer.preferredLocale ?? 'en',
  };
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [formState, setFormState] = useState<EditFormState>({
    email: '',
    firstName: '',
    lastName: '',
    notes: '',
    phone: '',
    preferredLocale: 'en',
  });
  const [jobs, setJobs] = useState<
    { id: string; title: string; status: string }[]
  >([]);

  // Stores an error if the jobs request fails.
  const [jobsError, setJobsError] = useState<string | null>(null);

  // TODO : POD 3 API for quotes and integrate into customer detail.

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        setLoading(true);
        setError(null);
        setJobs([]);
        setJobsError(null);

        const data = await fetchCustomerById(customerId);
        setCustomer(data);
        setFormState(toFormState(data));

        try {
          const jobData = await requestJson<{
            jobs: { id: string; title: string; status: string }[];
          }>(`/api/jobs?customerId=${customerId}`, {
            errorMessage: 'Failed to load jobs.',
          });
          setJobs(jobData.jobs);
        } catch (err) {
          // Keep the customer profile visible, but report the jobs failure.
          setJobsError(
            err instanceof Error ? err.message : 'Unable to load jobs.',
          );
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

  const handleStartEdit = () => {
    if (!customer) return;
    setFormState(toFormState(customer));
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (customer) {
      setFormState(toFormState(customer));
    }
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer) return;

    const firstName = formState.firstName.trim();
    const lastName = formState.lastName.trim();

    if (!firstName || !lastName) {
      setSaveError('First name and last name are required.');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      const updated = await updateCustomer(customer.id, {
        email: formState.email.trim() || null,
        firstName,
        lastName,
        notes: formState.notes.trim() || null,
        phone: formState.phone.trim() || null,
        preferredLocale: formState.preferredLocale.trim() || 'en',
      });

      setCustomer(updated);
      setFormState(toFormState(updated));
      setIsEditing(false);
      setSaveSuccess('Customer profile saved.');
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Failed to update customer profile.',
      );
    } finally {
      setSaving(false);
    }
  };
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
        <div className="flex items-center gap-2">
          <StatusBadge
            tone={customer.status === 'Pending' ? 'warning' : 'success'}
          >
            {customer.status ?? 'Active'}
          </StatusBadge>
          {!isEditing ? (
            <Button onClick={handleStartEdit} size="sm" variant="secondary">
              Edit profile
            </Button>
          ) : null}
        </div>
      </CardHeader>
      
            {saveSuccess ? (
        <CardContent className="pb-0">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {saveSuccess}
          </div>
        </CardContent>
      ) : null}

      {saveError ? (
        <CardContent className="pb-0">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {saveError}
          </div>
        </CardContent>
      ) : null}

      {isEditing ? (
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="customer-first-name"
              >
                First name *
              </label>
              <Input
                id="customer-first-name"
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                required
                value={formState.firstName}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="customer-last-name"
              >
                Last name *
              </label>
              <Input
                id="customer-last-name"
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
                required
                value={formState.lastName}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="customer-email"
              >
                Email
              </label>
              <Input
                id="customer-email"
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, email: e.target.value }))
                }
                type="email"
                value={formState.email}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="customer-phone"
              >
                Phone
              </label>
              <Input
                id="customer-phone"
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, phone: e.target.value }))
                }
                value={formState.phone}
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="customer-locale"
              >
                Preferred locale
              </label>
              <Input
                id="customer-locale"
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    preferredLocale: e.target.value,
                  }))
                }
                value={formState.preferredLocale}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                htmlFor="customer-notes"
              >
                Notes
              </label>
              <Input
                id="customer-notes"
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, notes: e.target.value }))
                }
                value={formState.notes}
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Button disabled={saving} type="submit" variant="accent">
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <Button
                disabled={saving}
                onClick={handleCancelEdit}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      ) : (
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="First name" value={customer.firstName ?? '—'} />
          <DetailItem label="Last name" value={customer.lastName ?? '—'} />
          <DetailItem label="Email" value={customer.email ?? '—'} />
          <DetailItem label="Phone" value={customer.phone ?? '—'} />
          <DetailItem
            label="Preferred locale"
            value={customer.preferredLocale ?? 'en'}
          />
          <DetailItem label="Status" value={customer.status ?? 'Active'} />
          {customer.notes ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <DetailItem label="Notes" value={customer.notes} />
            </div>
          ) : null}
        </CardContent>
      )}

      <CardContent className="border-t border-border pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Jobs ({jobs.length})
        </p>

        {jobsError ? (
          <EmptyState title="Jobs unavailable" description={jobsError} />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No jobs found"
            description="There are currently no jobs linked to this customer."
          />
        ) : (
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
        )}
      </CardContent>
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
