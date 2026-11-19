import { beforeEach, describe, expect, it } from 'vitest';

import {
  customerFixtures,
  jobCardFixtureTenantIds,
  serviceRequestFixtures,
  vehicleFixtures,
} from '../fixtures/jobCardFixtures';
import { MockServiceRequestRepository } from './mockServiceRequestRepository';
import { ServiceRequestRelationshipValidationError } from './serviceRequestRepository';

const tenantId = jobCardFixtureTenantIds.northside;
const otherTenantId = jobCardFixtureTenantIds.southside;

const input = {
  customerId: customerFixtures[0].id,
  vehicleId: vehicleFixtures[0].id,
  requestedService: 'Brake inspection',
};

describe('MockServiceRequestRepository', () => {
  beforeEach(() => {
    serviceRequestFixtures.splice(0);
    customerFixtures.forEach((customer) => {
      customer.isArchived = false;
    });
    vehicleFixtures.forEach((vehicle) => {
      vehicle.isArchived = false;
    });
  });

  it('creates a service request and retrieves it by ID', async () => {
    const repository = new MockServiceRequestRepository();

    const created = await repository.create(tenantId, input);

    expect(created).toMatchObject({
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      requestedService: input.requestedService,
      status: 'received',
    });
    await expect(repository.getById(tenantId, created.id)).resolves.toEqual(
      created,
    );
  });

  it('rejects missing, archived, foreign-tenant, and mismatched relationships', async () => {
    const repository = new MockServiceRequestRepository();

    await expect(
      repository.create(tenantId, { ...input, customerId: 'missing' }),
    ).rejects.toBeInstanceOf(ServiceRequestRelationshipValidationError);
    await expect(
      repository.create(tenantId, { ...input, vehicleId: 'missing' }),
    ).rejects.toBeInstanceOf(ServiceRequestRelationshipValidationError);
    customerFixtures[0].isArchived = true;
    await expect(repository.create(tenantId, input)).rejects.toThrow(
      'customer is missing, archived',
    );
    customerFixtures[0].isArchived = false;
    await expect(repository.create(otherTenantId, input)).rejects.toThrow(
      'customer is missing, archived',
    );
    await expect(
      repository.create(tenantId, {
        ...input,
        vehicleId: vehicleFixtures[1].id,
      }),
    ).rejects.toThrow('vehicle is missing, archived');
    vehicleFixtures[0].isArchived = true;
    await expect(repository.create(tenantId, input)).rejects.toThrow(
      'vehicle is missing, archived',
    );
    vehicleFixtures[0].isArchived = false;

    const differentCustomer = {
      ...customerFixtures[1],
      id: '77777777-7777-4777-8777-777777777777',
      tenantId,
    };
    const mismatchedRepository = new MockServiceRequestRepository({
      customers: [...customerFixtures, differentCustomer],
      vehicles: [
        {
          ...vehicleFixtures[0],
          primaryCustomerId: customerFixtures[0].id,
        },
      ],
      serviceRequests: [],
    });
    await expect(
      mismatchedRepository.create(tenantId, {
        ...input,
        customerId: differentCustomer.id,
      }),
    ).rejects.toThrow('associated with the selected customer');
  });

  it('scopes list and direct lookup to the requested tenant', async () => {
    const repository = new MockServiceRequestRepository();
    const northside = await repository.create(tenantId, input);
    const southside = await repository.create(otherTenantId, {
      customerId: customerFixtures[1].id,
      vehicleId: vehicleFixtures[1].id,
      requestedService: 'Oil change',
    });

    await expect(repository.list(tenantId)).resolves.toEqual([northside]);
    await expect(
      repository.getById(tenantId, southside.id),
    ).resolves.toBeNull();
    await expect(
      repository.getById(otherTenantId, northside.id),
    ).resolves.toBeNull();
  });
});
