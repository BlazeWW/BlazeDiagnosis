import { z } from 'zod';

export const createChatThreadSchema = z.discriminatedUnion('type', [
  z
    .object({
      jobCardId: z.string().uuid(),
      type: z.literal('customer'),
    })
    .strict(),
  z
    .object({
      partsRequestId: z.string().uuid(),
      supplierId: z.string().uuid(),
      supplierUserId: z.string().min(1).max(255),
      type: z.literal('supplier'),
    })
    .strict(),
]);

export const sendChatMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
    visibility: z.enum(['internal', 'customer', 'supplier']).optional(),
  })
  .strict();

export const chatPaginationSchema = z
  .object({
    before: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const chatThreadParamsSchema = z.object({
  threadId: z.string().uuid(),
});
