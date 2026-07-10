import { describe, expect, it } from 'vitest';

import { createVehicleSchema } from './vehicleSchema';

const validCustomerId = '11111111-1111-4111-8111-111111111111';

describe('createVehicleSchema', () => {
  it('accepts a minimal valid vehicle record', () => {
    expect(
      createVehicleSchema.parse({
        make: 'Toyota',
        model: 'Corolla',
        primaryCustomerId: validCustomerId,
      }),
    ).toMatchObject({
      make: 'Toyota',
      model: 'Corolla',
      primaryCustomerId: validCustomerId,
    });
  });

  it('rejects impossible model years and invalid customer IDs', () => {
    expect(() =>
      createVehicleSchema.parse({
        make: 'Toyota',
        model: 'Corolla',
        primaryCustomerId: 'not-a-uuid',
        year: 1800,
      }),
    ).toThrow();
  });
});
