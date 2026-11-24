import { z } from 'zod';

export const createVehicleSchema = z.object({
  color: z.string().optional(),
  engineDetails: z.string().optional(),
  fuelType: z.string().optional(),
  make: z.string().min(1, 'Make is required'),
  mileage: z.number().int().nonnegative().optional(),
  model: z.string().min(1, 'Model is required'),
  notes: z.string().optional(),
  primaryCustomerId: z.string().uuid('Primary customer is required'),
  registrationNumber: z.string().optional(),
  transmission: z.string().optional(),
  vin: z
  .string()
  .optional()
  .refine(
    (value) => !value || (value.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(value)),
    { message: 'VIN must be a valid 17-character alphanumeric string'}
  ),
  year: z.number().int().min(1900).max(2100).optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
