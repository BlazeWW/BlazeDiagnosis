import type { IVehicleLookupProvider, VehicleProviderResult } from '../types';

export class SouthAfricaVehicleLookupProvider implements IVehicleLookupProvider {
  name = 'south-africa-registration';
  priority = 20;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async lookupByVin(vin: string): Promise<VehicleProviderResult> {
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message:
          'South Africa VIN/registration lookup is stubbed for future integration. Configure and implement the external API adapter before production use.',
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
        code: 'NOT_IMPLEMENTED',
        message:
          'South Africa registration lookup by plate is stubbed for future integration.',
      },
      source: this.name,
    };
  }
}
