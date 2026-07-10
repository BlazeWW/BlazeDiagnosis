import { describe, expect, it } from 'vitest';

import { createCustomerSchema } from './customerSchema';
import { customerVehicleIntakeSchema } from './customerVehicleIntakeSchema';

describe('customer schemas', () => {
  it('defaults preferred locale when creating a customer', () => {
    expect(
      createCustomerSchema.parse({ firstName: 'Ben', lastName: 'Henning' }),
    ).toMatchObject({
      firstName: 'Ben',
      lastName: 'Henning',
      preferredLocale: 'en',
    });
  });

  it('rejects invalid customer email addresses', () => {
    expect(() =>
      createCustomerSchema.parse({
        email: 'not-an-email',
        firstName: 'Ben',
        lastName: 'Henning',
      }),
    ).toThrow();
  });

  it('coerces vehicle intake numeric strings from wizard form payloads', () => {
    const parsed = customerVehicleIntakeSchema.parse({
      customer: {
        email: '',
        firstName: 'Jane',
        lastName: 'Customer',
      },
      vehicle: {
        make: 'Toyota',
        mileage: '125000',
        model: 'Hilux',
        registrationNumber: 'CA123456',
        year: '2020',
      },
    });

    expect(parsed.customer.email).toBeUndefined();
    expect(parsed.vehicle.mileage).toBe(125000);
    expect(parsed.vehicle.year).toBe(2020);
  });
});
