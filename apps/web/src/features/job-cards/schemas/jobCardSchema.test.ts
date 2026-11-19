import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_CONCERN_MAX_LENGTH,
  createServiceRequestSchema,
  SERVICE_DESCRIPTION_MAX_LENGTH,
} from './jobCardSchema';

const validPayload = {
  customerId: '11111111-1111-4111-8111-111111111111',
  vehicleId: '33333333-3333-4333-8333-333333333333',
  requestedService: 'Brake inspection',
};

describe('createServiceRequestSchema', () => {
  it('accepts a valid request with an optional preferred date', () => {
    const result = createServiceRequestSchema.parse({
      ...validPayload,
      preferredDate: '2026-11-02T10:00:00.000Z',
    });

    expect(result.preferredDate).toBe('2026-11-02T10:00:00.000Z');
  });

  it('rejects unknown fields such as tenantId', () => {
    expect(
      createServiceRequestSchema.safeParse({
        ...validPayload,
        tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid UUIDs and text beyond the configured bounds', () => {
    expect(
      createServiceRequestSchema.safeParse({
        ...validPayload,
        customerId: 'not-a-uuid',
      }).success,
    ).toBe(false);
    expect(
      createServiceRequestSchema.safeParse({
        ...validPayload,
        requestedService: 'x'.repeat(SERVICE_DESCRIPTION_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      createServiceRequestSchema.safeParse({
        ...validPayload,
        customerConcern: 'x'.repeat(CUSTOMER_CONCERN_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it('rejects invalid preferred dates', () => {
    expect(
      createServiceRequestSchema.safeParse({
        ...validPayload,
        preferredDate: 'not-a-date',
      }).success,
    ).toBe(false);
  });
});
