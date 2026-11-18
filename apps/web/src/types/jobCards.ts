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
export type WorkVisibility = 'internal' | 'customer';

// Staff (internal) shapes: include technician and internal entries/notes.
export type StaffLabourEntry = {
  id: string;
  technicianId: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  note: string | null;
  visibility: WorkVisibility;
};

export type StaffJobNote = {
  id: string;
  body: string;
  visibility: WorkVisibility;
  createdAt: string;
};

// Customer shapes: customer-visible items only, no technician or visibility fields.
export type CustomerLabourEntry = {
  id: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  note: string | null;
};

export type CustomerJobNote = {
  id: string;
  body: string;
  createdAt: string;
};

export type JobWork =
  | {
      audience: 'staff';
      labourEntries: StaffLabourEntry[];
      notes: StaffJobNote[];
    }
  | {
      audience: 'customer';
      labourEntries: CustomerLabourEntry[];
      notes: CustomerJobNote[];
    };
