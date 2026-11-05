import { z } from 'zod';

export const createServiceRequestSchema = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  requestedService: z.string().min(1),
  customerConcern: z.string().optional(),
  preferredDate: z.coerce.date().optional(),
});

export type CreateServiceRequestInput = z.infer<
  typeof createServiceRequestSchema
>;

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
