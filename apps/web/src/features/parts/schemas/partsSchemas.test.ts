import { describe, expect, it } from 'vitest';

import { createPartsCatalogSchema } from './partsCatalogSchema';
import { createSupplierResponseSchema } from './supplierResponseSchema';

const uuid = '11111111-1111-4111-8111-111111111111';

describe('parts schemas', () => {
  it('defaults optional catalog money fields', () => {
    expect(
      createPartsCatalogSchema.parse({
        name: 'Oil filter',
        partNumber: 'OF-123',
      }),
    ).toMatchObject({
      costPrice: '0.00',
      name: 'Oil filter',
      quantityOnHand: '0.00',
      retailPrice: '0.00',
    });
  });

  it('accepts supplier responses with at least one item', () => {
    expect(
      createSupplierResponseSchema.parse({
        items: [
          {
            partId: uuid,
            partName: 'Brake pads',
          },
        ],
        partsRequestId: uuid,
        supplierId: uuid,
      }),
    ).toMatchObject({
      items: [
        {
          availability: 'available',
          partId: uuid,
          partName: 'Brake pads',
        },
      ],
      partsRequestId: uuid,
      supplierId: uuid,
    });
  });
});
