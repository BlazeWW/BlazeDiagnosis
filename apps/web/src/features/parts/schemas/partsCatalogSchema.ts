import { z } from 'zod';

export const createPartsCatalogSchema = z.object({
  name: z.string().min(1, 'Part name is required'),
  partNumber: z.string().min(1, 'Part number is required'),
  sku: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.string().default('0.00'),
  retailPrice: z.string().default('0.00'),
  quantityOnHand: z.string().default('0.00'),
});

export type CreatePartsCatalogInput = z.infer<typeof createPartsCatalogSchema>;
