import { and, desc, eq, gt, lt, ne } from 'drizzle-orm';

import { db } from '@/db/client';
import { jobCards, jobLabourEntries, jobNotes, users } from '@/db/schema';
import { ApiRequestError } from '@/lib/api/response';
import { createAuditLog } from '@/lib/audit';
import type { AuthenticatedUser } from '@/lib/auth/session';
import {
  requireTenantPermission,
  TenantAccessError,
} from '@/lib/authorization/guards';
import { findSessionCustomerId, isStaffRole } from '@/server/sessionAudience';
import type { JobWork, StaffJobNote, StaffLabourEntry } from '@/types/jobCards';

import type {
  CorrectLabourEntryInput,
  CreateJobNoteInput,
  CreateLabourEntryInput,
} from '../schemas/jobWorkSchema';
import {
  serializeJobWork,
  toStaffJobNote,
  toStaffLabourEntry,
} from './jobWorkSerializers';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

const TECHNICIAN_ROLE = 'mechanic';
const MS_PER_MINUTE = 60_000;

// shortcut: actor_user_id needs a users.id, but sessions only carry the Auth0 id; move this into actorUserId once users are linked to Auth0.
function actorOf(user: AuthenticatedUser) {
  return { authUserId: user.id, email: user.email };
}

async function findJobCard(
  executor: Executor,
  tenantId: string,
  jobCardId: string,
) {
  const [job] = await executor
    .select({ id: jobCards.id, customerId: jobCards.customerId })
    .from(jobCards)
    .where(and(eq(jobCards.id, jobCardId), eq(jobCards.tenantId, tenantId)))
    .limit(1);

  if (!job) {
    throw new ApiRequestError('NOT_FOUND', 404, 'Job not found');
  }

  return job;
}

async function assertTechnician(
  tx: Tx,
  tenantId: string,
  technicianId: string,
) {
  const [technician] = await tx
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, technicianId),
        eq(users.tenantId, tenantId),
        eq(users.role, TECHNICIAN_ROLE),
      ),
    )
    .limit(1);

  if (!technician) {
    throw new ApiRequestError(
      'VALIDATION_ERROR',
      422,
      `Technician not found or does not have the ${TECHNICIAN_ROLE} role`,
    );
  }
}

function durationMinutes(startedAt: Date, endedAt: Date) {
  const minutes = Math.round(
    (endedAt.getTime() - startedAt.getTime()) / MS_PER_MINUTE,
  );

  if (minutes < 1) {
    throw new ApiRequestError(
      'VALIDATION_ERROR',
      422,
      'End time must be at least one minute after start time.',
    );
  }

  return minutes;
}

// shortcut: check-then-write, so two simultaneous saves for one technician can still overlap; add a Postgres exclusion constraint in the migration if that matters.
async function assertNoOverlap(
  tx: Tx,
  tenantId: string,
  technicianId: string,
  startedAt: Date,
  endedAt: Date,
  ignoreEntryId?: string,
) {
  const [clash] = await tx
    .select({ id: jobLabourEntries.id })
    .from(jobLabourEntries)
    .where(
      and(
        eq(jobLabourEntries.tenantId, tenantId),
        eq(jobLabourEntries.technicianId, technicianId),
        lt(jobLabourEntries.startedAt, endedAt),
        gt(jobLabourEntries.endedAt, startedAt),
        ignoreEntryId ? ne(jobLabourEntries.id, ignoreEntryId) : undefined,
      ),
    )
    .limit(1);

  if (clash) {
    throw new ApiRequestError(
      'CONFLICT',
      409,
      'This technician already has time logged that overlaps this period.',
    );
  }
}

export async function getJobWork(
  tenantId: string,
  jobCardId: string,
): Promise<JobWork> {
  const user = await requireTenantPermission(tenantId, 'jobs.read');
  const audience = isStaffRole(user.tenantRole) ? 'staff' : 'customer';
  const job = await findJobCard(db, tenantId, jobCardId);

  if (audience === 'customer') {
    const customerId = await findSessionCustomerId(tenantId, user.id);

    if (!customerId || customerId !== job.customerId) {
      throw new TenantAccessError('Job card does not belong to this customer.');
    }
  }

  const [labourRows, noteRows] = await Promise.all([
    db
      .select()
      .from(jobLabourEntries)
      .where(
        and(
          eq(jobLabourEntries.tenantId, tenantId),
          eq(jobLabourEntries.jobCardId, jobCardId),
        ),
      )
      .orderBy(desc(jobLabourEntries.startedAt)),
    db
      .select()
      .from(jobNotes)
      .where(
        and(eq(jobNotes.tenantId, tenantId), eq(jobNotes.jobCardId, jobCardId)),
      )
      .orderBy(desc(jobNotes.createdAt)),
  ]);

  return serializeJobWork(audience, labourRows, noteRows);
}

export async function addLabourEntry(
  tenantId: string,
  jobCardId: string,
  input: CreateLabourEntryInput,
): Promise<StaffLabourEntry> {
  const user = await requireTenantPermission(tenantId, 'jobs.update_status');
  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  const minutes = durationMinutes(startedAt, endedAt);

  const entry = await db.transaction(async (tx) => {
    await findJobCard(tx, tenantId, jobCardId);
    await assertTechnician(tx, tenantId, input.technicianId);
    await assertNoOverlap(tx, tenantId, input.technicianId, startedAt, endedAt);

    const [created] = await tx
      .insert(jobLabourEntries)
      .values({
        tenantId,
        jobCardId,
        technicianId: input.technicianId,
        startedAt,
        endedAt,
        minutes,
        note: input.note ?? null,
        visibility: input.visibility,
      })
      .returning();

    return created;
  });

  await createAuditLog({
    tenantId,
    action: 'job_card.labour_added',
    entityType: 'job_labour_entry',
    entityId: entry.id,
    newValue: { ...toStaffLabourEntry(entry), jobCardId, actor: actorOf(user) },
  });

  return toStaffLabourEntry(entry);
}

export async function correctLabourEntry(
  tenantId: string,
  jobCardId: string,
  entryId: string,
  input: CorrectLabourEntryInput,
): Promise<StaffLabourEntry> {
  const user = await requireTenantPermission(tenantId, 'jobs.update_status');

  const { before, after } = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(jobLabourEntries)
      .where(
        and(
          eq(jobLabourEntries.id, entryId),
          eq(jobLabourEntries.tenantId, tenantId),
          eq(jobLabourEntries.jobCardId, jobCardId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new ApiRequestError('NOT_FOUND', 404, 'Labour entry not found');
    }

    const technicianId = input.technicianId ?? existing.technicianId;
    const startedAt = input.startedAt
      ? new Date(input.startedAt)
      : existing.startedAt;
    const endedAt = input.endedAt ? new Date(input.endedAt) : existing.endedAt;
    const minutes = durationMinutes(startedAt, endedAt);

    if (technicianId !== existing.technicianId) {
      await assertTechnician(tx, tenantId, technicianId);
    }
    await assertNoOverlap(
      tx,
      tenantId,
      technicianId,
      startedAt,
      endedAt,
      entryId,
    );

    const [updated] = await tx
      .update(jobLabourEntries)
      .set({
        technicianId,
        startedAt,
        endedAt,
        minutes,
        note: input.note === undefined ? existing.note : input.note,
        visibility: input.visibility ?? existing.visibility,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobLabourEntries.id, entryId),
          eq(jobLabourEntries.tenantId, tenantId),
        ),
      )
      .returning();

    return { before: existing, after: updated };
  });

  // The audit trail is the correction history: every change keeps the old values and the reason.
  await createAuditLog({
    tenantId,
    action: 'job_card.labour_corrected',
    entityType: 'job_labour_entry',
    entityId: entryId,
    previousValue: toStaffLabourEntry(before),
    newValue: {
      ...toStaffLabourEntry(after),
      jobCardId,
      reason: input.reason,
      actor: actorOf(user),
    },
  });

  return toStaffLabourEntry(after);
}

export async function addJobNote(
  tenantId: string,
  jobCardId: string,
  input: CreateJobNoteInput,
): Promise<StaffJobNote> {
  await requireTenantPermission(
    tenantId,
    input.visibility === 'customer'
      ? 'jobs.add_customer_note'
      : 'jobs.add_internal_note',
  );

  // The job card must belong to the session tenant before a note can point at it.
  await findJobCard(db, tenantId, jobCardId);

  const [note] = await db
    .insert(jobNotes)
    .values({
      tenantId,
      jobCardId,
      body: input.body,
      visibility: input.visibility,
    })
    .returning();

  return toStaffJobNote(note);
}
