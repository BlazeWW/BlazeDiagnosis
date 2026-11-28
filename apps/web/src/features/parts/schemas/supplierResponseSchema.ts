import { z } from 'zod';

const availabilityEnum = z.enum(['available', 'partial', 'unavailable']);

const positiveQuantity = z.union([z.string(), z.number()]).transform((value) => {
  const num = typeof value === 'number' ? value : Number(value);
  return num;
}).refine((n) => Number.isFinite(n) && n > 0, {
  message: 'Quantity must be greater than zero.',
});

const nonNegativePrice = z.union([z.string(), z.number()]).transform((value) => {
  const num = typeof value === 'number' ? value : Number(value);
  return num;
}).refine((n) => Number.isFinite(n) && n >= 0, {
  message: 'Unit price cannot be negative.',
});

const futureEta = z.string().datetime().refine(
  (value) => new Date(value).getTime() > Date.now(),
  { message: 'ETA must be in the future.' },
);

export const createSupplierResponseSchema = z.object({
  deliveryFee: z.union([z.string(), z.number()]).optional(),
  eta: futureEta.optional(),
  items: z
    .array(
      z.object({
        availability: availabilityEnum.default('available'),
        brand: z.string().optional(),
        partId: z.string().uuid(),
        partName: z.string().min(1, 'Part name is required.'),
        partNumber: z.string().optional(),
        quantityAvailable: positiveQuantity,
        unitPrice: nonNegativePrice,
      }),
    )
    .min(1),
  partsRequestId: z.string().uuid(),
  subtotal: z.union([z.string(), z.number()]).default(0),
  supplierId: z.string().uuid(),
  tax: z.union([z.string(), z.number()]).default(0),
  total: z.union([z.string(), z.number()]).default(0),
});

export type CreateSupplierResponseSchemaInput = z.infer<
  typeof createSupplierResponseSchema
>;