import { z } from 'zod';

import { jobInternalStatusEnum } from '@/db/schema/enums';
import type { CreateServiceRequestInputDto } from '@blaze-diagnostics/shared';

export const SERVICE_DESCRIPTION_MAX_LENGTH = 500;
export const CUSTOMER_CONCERN_MAX_LENGTH = 2000;
export const JOB_STATUS_REASON_MAX_LENGTH = 2000;

export const createServiceRequestSchema: z.ZodType<CreateServiceRequestInputDto> =
  z
    .object({
      customerId: z.string().uuid(),
      vehicleId: z.string().uuid(),
      requestedService: z
        .string()
        .trim()
        .min(1)
        .max(SERVICE_DESCRIPTION_MAX_LENGTH),
      customerConcern: z
        .string()
        .trim()
        .max(CUSTOMER_CONCERN_MAX_LENGTH)
        .optional(),
      preferredDate: z.string().datetime().optional(),
    })
    .strict();

export const updateJobStatusSchema = z
  .object({
    targetInternalStatus: z.enum(jobInternalStatusEnum.enumValues),
    expectedStatusVersion: z.number().int().nonnegative(),
    reason: z
      .string()
      .trim()
      .min(1)
      .max(JOB_STATUS_REASON_MAX_LENGTH)
      .optional(),
  })
  .strict();

export type CreateServiceRequestInput = z.infer<
  typeof createServiceRequestSchema
>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;

const nullableUuid = z.string().uuid().optional().nullable();

//undefined = leave unchanged, null clear, uuid = assign/change

export const assignStaffSchema = z
  .object({
    mechanicId: nullableUuid,
    floorManagerId: nullableUuid,
  })
  .refine(
    (data) =>
      data.mechanicId !== undefined || data.floorManagerId !== undefined,
    {
      message: 'At least one staff field must be provided.',
    },
  );

export type AssignStaffInput = z.infer<typeof assignStaffSchema>;
