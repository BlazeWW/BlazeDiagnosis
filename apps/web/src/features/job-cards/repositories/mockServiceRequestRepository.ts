import {
  customerFixtures,
  serviceRequestFixtures,
  vehicleFixtures,
} from '../fixtures/jobCardFixtures';

import type {
  CustomerFixture,
  ServiceRequestFixture,
  VehicleFixture,
} from '../fixtures/jobCardFixtures';
import type {
  CreateServiceRequestInputDto,
  CreateServiceRequestResponseDto,
} from '@blaze-diagnostics/shared';
import type { ServiceRequestRepository } from './serviceRequestRepository';
import { ServiceRequestRelationshipValidationError } from './serviceRequestRepository';

type MockServiceRequestFixtures = {
  customers: CustomerFixture[];
  vehicles: VehicleFixture[];
  serviceRequests: ServiceRequestFixture[];
};

const defaultFixtures: MockServiceRequestFixtures = {
  customers: customerFixtures,
  vehicles: vehicleFixtures,
  serviceRequests: serviceRequestFixtures,
};

export class MockServiceRequestRepository implements ServiceRequestRepository {
  constructor(
    private readonly fixtures: MockServiceRequestFixtures = defaultFixtures,
  ) {}

  async create(
    tenantId: string,
    input: CreateServiceRequestInputDto,
  ): Promise<CreateServiceRequestResponseDto> {
    const customer = this.fixtures.customers.find(
      (fixture) => fixture.id === input.customerId,
    );
    if (!customer || customer.isArchived || customer.tenantId !== tenantId) {
      throw new ServiceRequestRelationshipValidationError(
        'The customer is missing, archived, or does not belong to this tenant.',
      );
    }

    const vehicle = this.fixtures.vehicles.find(
      (fixture) => fixture.id === input.vehicleId,
    );
    if (!vehicle || vehicle.isArchived || vehicle.tenantId !== tenantId) {
      throw new ServiceRequestRelationshipValidationError(
        'The vehicle is missing, archived, or does not belong to this tenant.',
      );
    }
    if (vehicle.primaryCustomerId !== customer.id) {
      throw new ServiceRequestRelationshipValidationError(
        'The vehicle must be associated with the selected customer.',
      );
    }

    const now = new Date().toISOString();
    const request: ServiceRequestFixture = {
      id: globalThis.crypto.randomUUID(),
      tenantId,
      customerId: customer.id,
      vehicleId: vehicle.id,
      requestedService: input.requestedService,
      ...(input.customerConcern !== undefined && {
        customerConcern: input.customerConcern,
      }),
      ...(input.preferredDate !== undefined && {
        preferredDate: input.preferredDate,
      }),
      status: 'received',
      createdAt: now,
      updatedAt: now,
    };
    this.fixtures.serviceRequests.push(request);

    return this.toResponse(request);
  }

  async list(tenantId: string): Promise<CreateServiceRequestResponseDto[]> {
    return this.fixtures.serviceRequests
      .filter((request) => request.tenantId === tenantId)
      .map((request) => this.toResponse(request));
  }

  async getById(
    tenantId: string,
    serviceRequestId: string,
  ): Promise<CreateServiceRequestResponseDto | null> {
    const request = this.fixtures.serviceRequests.find(
      (fixture) =>
        fixture.tenantId === tenantId && fixture.id === serviceRequestId,
    );
    return request ? this.toResponse(request) : null;
  }

  private toResponse(
    request: ServiceRequestFixture,
  ): CreateServiceRequestResponseDto {
    return {
      id: request.id,
      customerId: request.customerId,
      vehicleId: request.vehicleId,
      requestedService: request.requestedService,
      ...(request.customerConcern !== undefined && {
        customerConcern: request.customerConcern,
      }),
      ...(request.preferredDate !== undefined && {
        preferredDate: request.preferredDate,
      }),
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
