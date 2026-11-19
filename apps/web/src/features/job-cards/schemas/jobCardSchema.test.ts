import { describe, expect, it } from 'vitest';

import {
  createServiceRequestSchema,
  CUSTOMER_CONCERN_MAX_LENGTH,
  JOB_STATUS_REASON_MAX_LENGTH,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  updateJobStatusSchema,
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

  it.each([
    { tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    { unknownField: true },
  ])('rejects unknown fields such as tenantId', (unknownFields) => {
    expect(
      createServiceRequestSchema.safeParse({
        ...validPayload,
        ...unknownFields,
      }).success,
    ).toBe(false);
  });

  it('rejects invalid customer/vehicle UUIDs and text beyond configured bounds', () => {
    expect(
      createServiceRequestSchema.safeParse({
        ...validPayload,
        customerId: 'not-a-uuid',
      }).success,
    ).toBe(false);
    expect(
      createServiceRequestSchema.safeParse({
        ...validPayload,
        vehicleId: 'not-a-uuid',
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

describe('updateJobStatusSchema', () => {
  const validPayload = {
    targetInternalStatus: 'vehicle_received',
    expectedStatusVersion: 4,
  };

  it('accepts a valid target and concurrency token with an optional reason', () => {
    expect(updateJobStatusSchema.parse(validPayload)).toEqual(validPayload);
    expect(
      updateJobStatusSchema.parse({
        ...validPayload,
        targetInternalStatus: 'cancelled',
      }).targetInternalStatus,
    ).toBe('cancelled');
    expect(
      updateJobStatusSchema.parse({
        ...validPayload,
        reason: '  Customer requested cancellation.  ',
      }).reason,
    ).toBe('Customer requested cancellation.');
  });

  it('rejects invalid status, version, blank or oversized reasons', () => {
    expect(
      updateJobStatusSchema.safeParse({
        ...validPayload,
        targetInternalStatus: 'made_up_status',
      }).success,
    ).toBe(false);
    expect(
      updateJobStatusSchema.safeParse({
        ...validPayload,
        expectedStatusVersion: -1,
      }).success,
    ).toBe(false);
    expect(
      updateJobStatusSchema.safeParse({
        ...validPayload,
        expectedStatusVersion: 1.5,
      }).success,
    ).toBe(false);
    expect(
      updateJobStatusSchema.safeParse({ ...validPayload, reason: '  ' })
        .success,
    ).toBe(false);
    expect(
      updateJobStatusSchema.safeParse({
        ...validPayload,
        reason: 'x'.repeat(JOB_STATUS_REASON_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it('rejects client-supplied tenant and actor identity fields', () => {
    expect(
      updateJobStatusSchema.safeParse({
        ...validPayload,
        tenantId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }).success,
    ).toBe(false);
    expect(
      updateJobStatusSchema.safeParse({
        ...validPayload,
        actorId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(false);
  });
});
