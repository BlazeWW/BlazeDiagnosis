import type { IVehicleLookupProvider, VehicleProviderResult } from '../types';

export class ManualVehicleCatalogProvider implements IVehicleLookupProvider {
  name = 'manual-catalog';
  priority = 90;

  async isAvailable(): Promise<boolean> {
    return process.env.MANUAL_VEHICLE_CATALOG_ENABLED === 'true';
  }

  async lookupByVin(vin: string): Promise<VehicleProviderResult> {
    return {
      success: false,
      error: {
        code: 'MANUAL_CATALOG_NOT_CONFIGURED',
        message:
          'Manual vehicle catalog lookup is enabled but no catalog data loader is configured.',
      },
      source: this.name,
    };
  }

  async lookupByPlate(
    plate: string,
    country: string,
  ): Promise<VehicleProviderResult> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: `Manual vehicle catalog provider does not support plate lookup yet for ${country}.`,
      },
      source: this.name,
    };
  }
}
