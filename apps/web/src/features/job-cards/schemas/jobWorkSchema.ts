import { z } from 'zod';

const isoDateTime = z.string().datetime({ offset: true });
const visibility = z.enum(['internal', 'customer']);
const labourNote = z.string().trim().max(2000);

// Duration rules (end after start, no overlap) live in jobWorkService so create and correct share them.
export const createLabourEntrySchema = z
  .object({
    technicianId: z.string().uuid(),
    startedAt: isoDateTime,
    endedAt: isoDateTime,
    note: labourNote.optional(),
    visibility: visibility.default('internal'),
  })
  .strict();

export const correctLabourEntrySchema = z
  .object({
    technicianId: z.string().uuid().optional(),
    startedAt: isoDateTime.optional(),
    endedAt: isoDateTime.optional(),
    note: labourNote.nullable().optional(),
    visibility: visibility.optional(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict()
  .refine(
    (data) =>
      Object.entries(data).some(
        ([key, value]) => key !== 'reason' && value !== undefined,
      ),
    { message: 'At least one field must be corrected.' },
  );

export const createJobNoteSchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
    visibility: visibility.default('internal'),
  })
  .strict();

export type CreateLabourEntryInput = z.infer<typeof createLabourEntrySchema>;
export type CorrectLabourEntryInput = z.infer<typeof correctLabourEntrySchema>;
export type CreateJobNoteInput = z.infer<typeof createJobNoteSchema>;
