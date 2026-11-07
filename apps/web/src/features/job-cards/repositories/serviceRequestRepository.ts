import type {
  CreateServiceRequestInputDto,
  CreateServiceRequestResponseDto,
} from '@blaze-diagnostics/shared';

export interface ServiceRequestRepository {
  create(
    tenantId: string,
    input: CreateServiceRequestInputDto,
  ): Promise<CreateServiceRequestResponseDto>;
}

export class ServiceRequestRelationshipValidationError extends Error {
  readonly code = 'SERVICE_REQUEST_RELATIONSHIP_INVALID';

  constructor(
    message = 'The customer and vehicle must belong to the same tenant and be associated.',
  ) {
    super(message);
    this.name = 'ServiceRequestRelationshipValidationError';
  }
}
