import { ManualVehicleCatalogProvider } from './implementations/manualCatalog';
import { MockVehicleLookupProvider } from './implementations/mock';
import { SouthAfricaVehicleLookupProvider } from './implementations/southAfrica';
import { VinDecoderProvider } from './implementations/vindecoder';
import type { IVehicleLookupProvider, VehicleProviderResult } from './types';

const vehicleProviders: IVehicleLookupProvider[] = [];

export function getVehicleProviders(): IVehicleLookupProvider[] {
  if (vehicleProviders.length === 0) {
    const vinDecoderApiKey = process.env.VIN_DECODER_API_KEY;
    const saApiKey = process.env.SA_VEHICLE_LOOKUP_API_KEY;
    const manualEnabled = process.env.MANUAL_VEHICLE_CATALOG_ENABLED === 'true';

    if (saApiKey) {
      vehicleProviders.push(new SouthAfricaVehicleLookupProvider(saApiKey));
    }

    if (vinDecoderApiKey) {
      vehicleProviders.push(new VinDecoderProvider(vinDecoderApiKey));
    }

    if (manualEnabled) {
      vehicleProviders.push(new ManualVehicleCatalogProvider());
    }

    vehicleProviders.push(new MockVehicleLookupProvider());
    vehicleProviders.sort((a, b) => a.priority - b.priority);
  }

  return vehicleProviders;
}

export async function lookupVehicleByVin(
  vin: string,
): Promise<VehicleProviderResult> {
  const providers = getVehicleProviders();

  for (const provider of providers) {
    if (!(await provider.isAvailable())) {
      continue;
    }

    const result = await provider.lookupByVin(vin);
    if (result.success) {
      return result;
    }
  }

  return {
    success: false,
    error: {
      code: 'ALL_PROVIDERS_FAILED',
      message: 'No vehicle provider returned a successful result.',
    },
    source: 'registry',
  };
}
