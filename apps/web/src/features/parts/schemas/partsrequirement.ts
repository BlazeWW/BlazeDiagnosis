import { z } from 'zod';

export const createPartsFitmentSchema = z.object({
  partId: z.string().uuid('A valid Part ID UUID is Mandatory'),
  make: z.string().min(1, 'Vehicle make specification is Mandatory'),
  model: z.string().min(1, 'Vehicle model specification is Mandatory'),
  year: z.string().length(4, 'Vehicle production year must be exactly 4 digits'),
  variant: z.string().min(1, 'Vehicle variant/trim configuration is required'),
  engine: z.string().min(1, 'Engine code or capacity definition is required'),
  fuelType: z.string().min(1, 'Engine fuel type parameter is required'),
  transmission: z.string().min(1, 'Transmission specification selection is required'),
  source: z.enum(['manual', 'provider_api', 'csv_import']).default('manual'),
});

export type CreatePartsFitmentInput = z.infer<typeof createPartsFitmentSchema>;
