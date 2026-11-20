'use client';

import { type FormEvent, useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/statusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  addJobNote,
  addLabourEntry,
  fetchEligibleStaff,
  fetchJobCards,
  fetchJobWork,
} from '@/lib/apiClient';
import type {
  EligibleStaffMember,
  JobCardRecord,
  JobWork,
  WorkVisibility,
} from '@/types/jobCards';

const selectClassName =
  'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function JobWorkPanel() {
  const [jobCards, setJobCards] = useState<JobCardRecord[]>([]);
  const [technicians, setTechnicians] = useState<EligibleStaffMember[]>([]);
  const [jobCardId, setJobCardId] = useState('');
  const [work, setWork] = useState<JobWork | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchJobCards(), fetchEligibleStaff()])
      .then(([jobs, staff]) => {
        setJobCards(jobs.jobCards);
        setTechnicians(staff.staff.filter((s) => s.role === 'mechanic'));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load data'),
      );
  }, []);

  const loadWork = async (id: string) => {
    setJobCardId(id);
    setWork(null);
    setError(null);
    if (!id) return;

    try {
      setWork((await fetchJobWork(id)).work);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load work');
    }
  };

  // Runs a save, then reloads the job's work so lists and totals stay in sync.
  const save = async (
    action: () => Promise<unknown>,
    form: HTMLFormElement,
  ) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      form.reset();
      await loadWork(jobCardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLabourSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = String(data.get('note') ?? '').trim();

    void save(
      () =>
        addLabourEntry(jobCardId, {
          technicianId: String(data.get('technicianId')),
          // datetime-local is local time; send it as an ISO instant.
          startedAt: new Date(String(data.get('startedAt'))).toISOString(),
          endedAt: new Date(String(data.get('endedAt'))).toISOString(),
          note: note || undefined,
          visibility: data.get('visibility') as WorkVisibility,
        }),
      event.currentTarget,
    );
  };

  const handleNoteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    void save(
      () =>
        addJobNote(jobCardId, {
          body: String(data.get('body') ?? ''),
          visibility: data.get('visibility') as WorkVisibility,
        }),
      event.currentTarget,
    );
  };

  const technicianName = (id: string) =>
    technicians.find((t) => t.userId === id)?.name ?? 'Unknown technician';

  const totalMinutes =
    work?.labourEntries.reduce((sum, entry) => sum + entry.minutes, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Labour and technician notes</CardTitle>
        <CardDescription>
          Log technician time and notes per job card. Internal items are never
          shown to customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          <Label htmlFor="work-job-card">Job card</Label>
          <select
            className={selectClassName}
            id="work-job-card"
            onChange={(event) => void loadWork(event.target.value)}
            value={jobCardId}
          >
            <option value="">Select a job card</option>
            {jobCards.map((job) => (
              <option key={job.id} value={job.id}>
                {job.jobNumber}
              </option>
            ))}
          </select>
        </div>

        {jobCardId && work ? (
          <>
            <section aria-labelledby="labour-heading" className="space-y-3">
              <h3 className="font-semibold" id="labour-heading">
                Labour ({Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m)
              </h3>
              {work.labourEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No labour logged yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {work.labourEntries.map((entry) => (
                    <li
                      className="rounded-lg border p-3 text-sm"
                      key={entry.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {'technicianId' in entry
                            ? technicianName(entry.technicianId)
                            : 'Technician'}{' '}
                          · {entry.minutes} min
                        </span>
                        {'visibility' in entry ? (
                          <StatusBadge
                            tone={
                              entry.visibility === 'customer'
                                ? 'success'
                                : 'neutral'
                            }
                          >
                            {entry.visibility === 'customer'
                              ? 'Customer'
                              : 'Internal'}
                          </StatusBadge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.startedAt)} –{' '}
                        {formatDateTime(entry.endedAt)}
                      </p>
                      {entry.note ? <p className="mt-1">{entry.note}</p> : null}
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
                onSubmit={handleLabourSubmit}
              >
                <div>
                  <Label htmlFor="labour-technician">Technician</Label>
                  <select
                    className={selectClassName}
                    id="labour-technician"
                    name="technicianId"
                    required
                  >
                    <option value="">Select a technician</option>
                    {technicians.map((t) => (
                      <option key={t.userId} value={t.userId}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="labour-visibility">Visibility</Label>
                  <select
                    className={selectClassName}
                    defaultValue="internal"
                    id="labour-visibility"
                    name="visibility"
                  >
                    <option value="internal">Internal</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="labour-start">Start</Label>
                  <Input
                    id="labour-start"
                    name="startedAt"
                    required
                    type="datetime-local"
                  />
                </div>
                <div>
                  <Label htmlFor="labour-end">End</Label>
                  <Input
                    id="labour-end"
                    name="endedAt"
                    required
                    type="datetime-local"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="labour-note">Note (optional)</Label>
                  <Input id="labour-note" maxLength={2000} name="note" />
                </div>
                <Button
                  disabled={saving}
                  size="sm"
                  type="submit"
                  variant="accent"
                >
                  {saving ? 'Saving...' : 'Log time'}
                </Button>
              </form>
            </section>

            <section aria-labelledby="notes-heading" className="space-y-3">
              <h3 className="font-semibold" id="notes-heading">
                Technician notes
              </h3>
              {work.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {work.notes.map((note) => (
                    <li className="rounded-lg border p-3 text-sm" key={note.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(note.createdAt)}
                        </span>
                        {'visibility' in note ? (
                          <StatusBadge
                            tone={
                              note.visibility === 'customer'
                                ? 'success'
                                : 'neutral'
                            }
                          >
                            {note.visibility === 'customer'
                              ? 'Customer'
                              : 'Internal'}
                          </StatusBadge>
                        ) : null}
                      </div>
                      <p className="mt-1">{note.body}</p>
                    </li>
                  ))}
                </ul>
              )}

              <form
                className="grid gap-3 rounded-lg border p-3"
                onSubmit={handleNoteSubmit}
              >
                <div>
                  <Label htmlFor="note-body">Note</Label>
                  <textarea
                    className={selectClassName}
                    id="note-body"
                    maxLength={5000}
                    name="body"
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="note-visibility">Visibility</Label>
                  <select
                    className={selectClassName}
                    defaultValue="internal"
                    id="note-visibility"
                    name="visibility"
                  >
                    <option value="internal">Internal</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
                <Button
                  disabled={saving}
                  size="sm"
                  type="submit"
                  variant="accent"
                >
                  {saving ? 'Saving...' : 'Add note'}
                </Button>
              </form>
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
