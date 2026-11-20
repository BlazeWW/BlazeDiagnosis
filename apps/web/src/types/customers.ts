export type Customer = {
  email?: string | null;
  firstName?: string;
  id: string;
  lastName?: string;
  notes?: string | null;
  phone?: string | null;
  preferredLocale?: string | null;
  status?: string;
};

export type CustomerFormState = {
  address: string;
  alternateNumber: string;
  companyName: string;
  email: string;
  firstName: string;
  lastName: string;
  marketingConsent: boolean;
  mobileNumber: string;
  preferredCommunicationChannel: string;
  taxNumber: string;
};
