export type CreateServiceRequestInputDto = {
  customerId: string;
  vehicleId: string;
  requestedService: string;
  customerConcern?: string;
  preferredDate?: string;
};

export type CreateServiceRequestResponseDto = {
  id: string;
  customerId: string;
  vehicleId: string;
  requestedService: string;
  customerConcern?: string;
  preferredDate?: string;
  status: 'draft' | 'received' | 'converted' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};
