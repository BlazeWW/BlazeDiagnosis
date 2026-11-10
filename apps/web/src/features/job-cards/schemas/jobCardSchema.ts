import { z } from 'zod';

import type { CreateServiceRequestInputDto } from '@blaze-diagnostics/shared';

export const SERVICE_DESCRIPTION_MAX_LENGTH = 500;
export const CUSTOMER_CONCERN_MAX_LENGTH = 2000;

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

export type CreateServiceRequestInput = z.infer<
  typeof createServiceRequestSchema
>;
