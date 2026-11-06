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
  email: string;
  role: string;
  activeJobCount: number;
};