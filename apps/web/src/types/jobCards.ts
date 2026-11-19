export type JobCardRecord = {
  id: string;
  jobNumber: string;
  internalStatus: string;
  assignedMechanicId: string | null;
  assignedFloorManagerId: string | null;
};

export type EligibleStaffMember = {
  userId: string;
  name: string;
  role: string;
  activeJobCount: number;
};
export type ServiceRequestStatus =
  | 'draft'
  | 'received'
  | 'converted'
  | 'cancelled';

export type ServiceRequestRecord = {
  id: string;
  customerId: string;
  vehicleId: string;
  requestedService: string;
  customerConcern?: string;
  preferredDate?: string;
  status: ServiceRequestStatus;
  createdAt: string;
  updatedAt: string;
};
