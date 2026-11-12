export type CustomerFixture = {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  isArchived: boolean;
};

export type VehicleFixture = {
  id: string;
  tenantId: string;
  primaryCustomerId: string;
  make: string;
  model: string;
  registrationNumber: string;
  isArchived: boolean;
};

export type ServiceRequestFixture = {
  id: string;
  tenantId: string;
  customerId: string;
  vehicleId: string;
  requestedService: string;
  customerConcern?: string;
  preferredDate?: string;
  status: 'received';
  createdAt: string;
  updatedAt: string;
};

export type JobCardFixture = {
  id: string;
  tenantId: string;
  customerId: string;
  vehicleId: string;
  jobNumber: string;
  internalStatus: 'request_received';
};

export const jobCardFixtureTenantIds = {
  northside: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  southside: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
} as const;

export const customerFixtures: CustomerFixture[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: jobCardFixtureTenantIds.northside,
    firstName: 'Lerato',
    lastName: 'Mokoena',
    isArchived: false,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    tenantId: jobCardFixtureTenantIds.southside,
    firstName: 'Thabo',
    lastName: 'Naidoo',
    isArchived: false,
  },
];

export const vehicleFixtures: VehicleFixture[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    tenantId: jobCardFixtureTenantIds.northside,
    primaryCustomerId: customerFixtures[0].id,
    make: 'Toyota',
    model: 'Corolla',
    registrationNumber: 'CA 123-456',
    isArchived: false,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    tenantId: jobCardFixtureTenantIds.southside,
    primaryCustomerId: customerFixtures[1].id,
    make: 'Volkswagen',
    model: 'Polo',
    registrationNumber: 'GP 789-012',
    isArchived: false,
  },
];

export const serviceRequestFixtures: ServiceRequestFixture[] = [];

export const jobCardFixtures: JobCardFixture[] = [
  {
    id: '55555555-5555-4555-8555-555555555555',
    tenantId: jobCardFixtureTenantIds.northside,
    customerId: customerFixtures[0].id,
    vehicleId: vehicleFixtures[0].id,
    jobNumber: 'NORTH-0001',
    internalStatus: 'request_received',
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    tenantId: jobCardFixtureTenantIds.southside,
    customerId: customerFixtures[1].id,
    vehicleId: vehicleFixtures[1].id,
    jobNumber: 'SOUTH-0001',
    internalStatus: 'request_received',
  },
];
