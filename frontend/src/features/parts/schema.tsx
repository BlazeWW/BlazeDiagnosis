import { z } from 'zod';

const partNumberSchema = z.string().min(1, 'Part number is required.').max(100);
const descriptionSchema = z.string().min(1, 'Description is required.');
const quantitySchema = z.number().int().positive('Quantity must be greater than 0.');

export const createPartsRequestDraftSchema = z.object({
  partNumber: partNumberSchema,
  description: descriptionSchema,
  quantity: quantitySchema,
});

export type CreatePartsRequestDraftInput = z.infer<typeof createPartsRequestDraftSchema>;
