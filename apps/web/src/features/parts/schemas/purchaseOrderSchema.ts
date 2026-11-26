import { z } from 'zod';

import { partsOrderStatuses } from '@/features/parts/services/purchaseOrderLifecycle';

export const createPurchaseOrderSchema = z.object({
  supplierResponseId: z.string().uuid(),
});

export const listPurchaseOrdersQuerySchema = z.object({
  jobCardId: z.string().uuid().optional(),
});

export const purchaseOrderTransitionSchema = z
  .object({
    note: z.string().trim().max(500).optional(),
    quantityOrdered: z.number().optional(),
    quantityReceived: z.number().optional(),
    status: z.enum(partsOrderStatuses),
  })
  .superRefine((value, context) => {
    const hasOrdered = value.quantityOrdered !== undefined;
    const hasReceived = value.quantityReceived !== undefined;

    if (hasOrdered !== hasReceived) {
      context.addIssue({
        code: 'custom',
        message: 'quantityOrdered and quantityReceived must be sent together.',
        path: ['quantityReceived'],
      });
    }

    if (
      value.status === 'partially_delivered' &&
      (!hasOrdered || !hasReceived)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'Partial fulfillment requires quantityOrdered and quantityReceived.',
        path: ['quantityReceived'],
      });
    }
  });

export type CreatePurchaseOrderInput = z.infer<
  typeof createPurchaseOrderSchema
>;
export type PurchaseOrderTransitionInput = z.infer<
  typeof purchaseOrderTransitionSchema
>;
