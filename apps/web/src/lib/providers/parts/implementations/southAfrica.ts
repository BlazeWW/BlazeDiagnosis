import type { IPartsFitmentProvider, PartsFitmentResult } from '../types';

export class SouthAfricaPartsFitmentProvider implements IPartsFitmentProvider {
  name = 'south-africa-fitment';
  priority = 25;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async lookupByPartNumber(partNumber: string): Promise<PartsFitmentResult> {
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message:
          'South Africa parts fitment lookup is stubbed for future integration. Implement the external provider adapter before using this in production.',
      },
      source: this.name,
    };
  }

  async searchByVehicle(
    make: string,
    model: string,
    year: number,
  ): Promise<PartsFitmentResult> {
    return {
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message:
          'South Africa parts fitment search is stubbed for future integration.',
      },
      source: this.name,
    };
  }
}
