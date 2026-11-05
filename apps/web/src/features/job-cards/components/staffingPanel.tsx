'use client';

import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  assignJobStaff,
  fetchEligibleStaff,
  fetchJobCards,
} from '@/lib/apiClient';
import type { EligibleStaffMember, JobCardRecord } from '@/types/jobCards';

export function StaffingPanel() {
  const [jobCards, setJobCards] = useState<JobCardRecord[]>([]);
  const [staff, setStaff] = useState<EligibleStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selections, setSelections] = useState<
    Record<string, { mechanicId?: string; floorManagerId?: string }>
  >({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [jobs, members] = await Promise.all([
          fetchJobCards(),
          fetchEligibleStaff(),
        ]);
        setJobCards(jobs.jobCards);
        setStaff(members.staff);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const mechanics = staff.filter((s) => s.role === 'mechanic');
  const floorManagers = staff.filter((s) => s.role === 'floor_manager');

  const handleSave = async (jobCardId: string) => {
    const sel = selections[jobCardId];
    if (!sel) return;

    setSavingId(jobCardId);
    setError(null);

    try {
      const payload: {
        mechanicId?: string | null;
        floorManagerId?: string | null;
      } = {};

      if (sel.mechanicId !== undefined) {
        payload.mechanicId = sel.mechanicId === '' ? null : sel.mechanicId;
      }

      if (sel.floorManagerId !== undefined) {
        payload.floorManagerId =
          sel.floorManagerId === '' ? null : sel.floorManagerId;
      }

      const { jobCard } = await assignJobStaff(jobCardId, payload);
      setJobCards((current) =>
        current.map((j) => (j.id === jobCardId ? jobCard : j)),
      );

      setSelections((current) => {
        const next = { ...current };
        delete next[jobCardId];
        return next;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save assignment',
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staffing Panel</CardTitle>
        <CardDescription>
          Assign a mechanic and floor manager. Workload shows active jobs
          (completed and cancelled excluded)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {jobCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No job cards found</p>
        ) : (
          jobCards.map((job) => {
            const sel = selections[job.id] ?? {};
            return (
              <div className="rounded-lg border p-4" key={job.id}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{job.jobNumber}</span>
                  <StatusBadge tone="neutral">{job.internalStatus}</StatusBadge>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <StaffSelect
                    id={`mechanic-${job.id}`}
                    label="Mechanic"
                    members={mechanics}
                    onChange={(value) =>
                      setSelections((prev) => ({
                        ...prev,
                        [job.id]: { ...prev[job.id], mechanicId: value },
                      }))
                    }
                    value={sel.mechanicId ?? job.assignedMechanicId ?? ''}
                  />
                  <StaffSelect
                    id={`manager-${job.id}`}
                    label="Floor manager"
                    members={floorManagers}
                    onChange={(value) =>
                      setSelections((prev) => ({
                        ...prev,
                        [job.id]: { ...prev[job.id], floorManagerId: value },
                      }))
                    }
                    value={
                      sel.floorManagerId ?? job.assignedFloorManagerId ?? ''
                    }
                  />
                </div>
                <Button
                  className="mt-4"
                  disabled={
                    savingId === job.id ||
                    (sel.mechanicId === undefined &&
                      sel.floorManagerId === undefined)
                  }
                  onClick={() => void handleSave(job.id)}
                  size="sm"
                  variant="accent"
                >
                  {savingId === job.id ? 'Saving...' : 'Save Assignment'}
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function StaffSelect({
  id,
  label,
  members,
  onChange,
  value,
}: {
  id: string;
  label: string;
  members: EligibleStaffMember[];
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name} — {member.activeJobCount} active job
            {member.activeJobCount === 1 ? '' : 's'}
          </option>
        ))}
      </select>
    </div>
  );
}
