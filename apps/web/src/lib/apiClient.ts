import type { ApiResponse } from '@/types/api';
import type { Customer } from '@/types/customers';
import type { VehicleRecord } from '@/types/vehicles';

type RequestOptions = RequestInit & {
  errorMessage?: string;
};

export async function requestJson<TData>(
  input: RequestInfo | URL,
  { errorMessage = 'API request failed.', ...init }: RequestOptions = {},
) {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || !payload.success) {
    const message = payload.success ? errorMessage : payload.error.message;
    throw new Error(message);
  }

  return payload.data;
}

export async function fetchCustomers(query?: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  return requestJson<{ customers: Customer[] }>(`/api/customers${params}`, {
    errorMessage: 'Failed to fetch customers.',
  });
}

export async function fetchCustomerById(customerId: string) {
  const data = await requestJson<{ customer: Customer }>(
    `/api/customers/${customerId}`,
    {
      errorMessage: 'Failed to fetch customer profile detail records.',
    },
  );

  return data.customer;
}

export async function fetchVehiclesForCustomer(customerId: string) {
  return requestJson<{ vehicles: unknown[] }>(`/api/vehicles/customer/${customerId}`, {
    errorMessage: 'Failed to fetch customer vehicles.',
  });
}


export async function fetchCustomerIntakeHistory(customerId: string) {
  return requestJson<{ intakes: VehicleRecord[] }>(
    `/api/customer-intakes?customerId=${encodeURIComponent(customerId)}`,
    {
      errorMessage: 'Failed to fetch customer intake history.',
    },
  );
}

export async function createCustomerVehicleIntake(intakeData: unknown) {
  return requestJson<{ intake: unknown }>('/api/customer-intakes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(intakeData),
    errorMessage: 'Failed to create new customer vehicle intake.',
  });
}

export async function createVehicle(vehicleData: unknown) {
  return requestJson<{ vehicle: unknown }>('/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicleData),
    errorMessage: 'Failed to create vehicle.',
  });
}


export async function createCustomer(customerData: unknown) {
  const data = await requestJson<{ customer: Customer }>(`/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData),
    errorMessage: 'Failed to create new customer profile.',
  });

  return data.customer;
}

// Form Submission: Update an existing customer profile record
export async function updateCustomer(customerId: string, customerData: unknown) {
  const data = await requestJson<{ customer: Customer }>(`/api/customers/${customerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData),
    errorMessage: 'Failed to update customer profile data.',
  });

  return data.customer;
}

export async function updateVehicle(vehicleId: string, vehicleData: unknown) {
  return requestJson<{ vehicle: unknown }>(`/api/vehicles/${vehicleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicleData),
    errorMessage: 'Failed to update vehicle.',
  });
}

export async function deleteCustomer(customerId: string) {
  return requestJson<{ id: string; message: string }>(`/api/customers/${customerId}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete customer.',
  });
}

export async function deleteVehicle(vehicleId: string) {
  return requestJson<{ id: string; message: string }>(`/api/vehicles/${vehicleId}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete vehicle.',
  });
}