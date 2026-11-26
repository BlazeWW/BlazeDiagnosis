import type { jobLabourEntries, jobNotes } from '@/db/schema';
import type {
  CustomerJobNote,
  CustomerLabourEntry,
  JobWork,
  StaffJobNote,
  StaffLabourEntry,
  WorkVisibility,
} from '@/types/jobCards';

type LabourRow = typeof jobLabourEntries.$inferSelect;
type NoteRow = typeof jobNotes.$inferSelect;

// job_notes.visibility also allows 'supplier'; staff see it, but the type only exposes internal/customer.
function toWorkVisibility(value: string): WorkVisibility {
  return value === 'customer' ? 'customer' : 'internal';
}

export function toStaffLabourEntry(row: LabourRow): StaffLabourEntry {
  return {
    id: row.id,
    technicianId: row.technicianId,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    minutes: row.minutes,
    note: row.note,
    visibility: toWorkVisibility(row.visibility),
  };
}

function toCustomerLabourEntry(row: LabourRow): CustomerLabourEntry {
  return {
    id: row.id,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    minutes: row.minutes,
    note: row.note,
  };
}

export function toStaffJobNote(row: NoteRow): StaffJobNote {
  return {
    id: row.id,
    body: row.body,
    visibility: toWorkVisibility(row.visibility),
    createdAt: row.createdAt.toISOString(),
  };
}

function toCustomerJobNote(row: NoteRow): CustomerJobNote {
  return { id: row.id, body: row.body, createdAt: row.createdAt.toISOString() };
}

// The single place that decides what a customer may see: only rows marked 'customer'.
export function serializeJobWork(
  audience: JobWork['audience'],
  labourRows: LabourRow[],
  noteRows: NoteRow[],
): JobWork {
  if (audience === 'staff') {
    return {
      audience,
      labourEntries: labourRows.map(toStaffLabourEntry),
      notes: noteRows.map(toStaffJobNote),
    };
  }

  return {
    audience,
    labourEntries: labourRows
      .filter((row) => row.visibility === 'customer')
      .map(toCustomerLabourEntry),
    notes: noteRows
      .filter((row) => row.visibility === 'customer')
      .map(toCustomerJobNote),
  };
}
