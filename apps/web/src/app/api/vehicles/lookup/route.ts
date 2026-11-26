import {
  apiOk,
  handleApiError,
  handleMissingSearchParam,
  MissingSearchParamError,
  requireSearchParam,
} from '@/lib/api/response';

import { lookupVehicleByVin } from '@/lib/providers/vehicle/registry';

const routeName = '/api/vehicles/lookup';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const vin = requireSearchParam(searchParams, 'vin');

    const result = await lookupVehicleByVin(vin);

    return apiOk(result);
  } catch (error) {
    if (error instanceof MissingSearchParamError) {
      return handleMissingSearchParam(error);
    }

    return handleApiError(`GET ${routeName}`, error);
  }
}
