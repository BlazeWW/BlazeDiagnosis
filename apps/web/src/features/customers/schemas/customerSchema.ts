import { z } from 'zod';

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((val) => (val === '' ? undefined : val))
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .email('Invalid email address')
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val))
  .optional();

export const createCustomerSchema = z.object({
  email: optionalEmail,
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  notes: optionalTrimmedString,
  phone: optionalTrimmedString,
  preferredLocale: z.string().trim().min(1).default('en'),
});

export const updateCustomerSchema = z
  .object({
    email: z.string().trim().email('Invalid email address').nullable().optional(),
    firstName: z.string().trim().min(1, 'First name is required').optional(),
    lastName: z.string().trim().min(1, 'Last name is required').optional(),
    notes: z.string().trim().nullable().optional(),
    phone: z.string().trim().nullable().optional(),
    preferredLocale: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
      message: 'At least one editable field must be provided.',
    },
  );

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
