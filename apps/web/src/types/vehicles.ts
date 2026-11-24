export type VehicleStatus = 'Completed' | 'In service' | 'Pending';
export type VehicleHistoryAudience = 'staff' | 'customer';

export type VehicleRecord = {
  color?: string;
  engineType?: string;
  fuel: string;
  id: string;
  make: string;
  model: string;
  registration: string;
  status: VehicleStatus;
  transmission: string;
  variant: string;
  vin: string;
  year: string;
};

export type VehicleFormState = {
  color: string;
  customerId: string;
  engineType: string;
  fuelType: string;
  make: string;
  model: string;
  odometer: string;
  registrationNumber: string;
  transmission: string;
  variant: string;
  vin: string;
  year: string;
};

export type VehicleDetailRecord = {
  archived?: boolean;
  createdAt?: string;
  customerName?: string;
  id: string;
  inspections?: { date: string; id: string }[];
  jobs?: { id: string; status: string }[];
  make?: string;
  model?: string;
  quotes?: { amount: number; id: string }[];
  registrationNumber?: string;
  updatedAt?: string;
};


export type VehicleDetailProps = {
  vehicleId: string;
};

export type VehicleHistoryNote = {
  body: string;
  createdAt: string;
  visibility: 'internal' | 'customer' | 'supplier';
};

export type VehicleHistoryJob = {
  completedAt: string | null;
  createdAt: string;
  customerStatus: string;
  id: string;
  internalStatus?: string;
  jobNumber: string;
  notes: VehicleHistoryNote[];
  priority: string;
};

export type VehicleHistoryInspection = {
  completedAt: string | null;
  conditionNotes?: string | null;
  fuelLevel: string | null;
  id: string;
  mileage: number | null;
};

export type VehicleHistoryOdometerReading = {
  reading: number;
  recordedAt: string;
  source: string;
};

export type VehicleHistoryServiceRequest = {
  createdAt: string;
  customerConcern: string | null;
  id: string;
  preferredDate: string | null;
  requestedService: string;
  status: string;
};

export type VehicleServiceHistory = {
  generatedAt: string;
  inspections: VehicleHistoryInspection[];
  jobs: VehicleHistoryJob[];
  odometerReadings: VehicleHistoryOdometerReading[];
  serviceRequests: VehicleHistoryServiceRequest[];
  vehicleId: string;
};


