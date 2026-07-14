import type { IPartsFitmentProvider, PartsFitmentResult } from '../types';

export class ManualPartsCatalogProvider implements IPartsFitmentProvider {
  name = 'manual-catalog';
  priority = 90;

  async isAvailable(): Promise<boolean> {
    return process.env.MANUAL_PARTS_CATALOG_ENABLED === 'true';
  }

  async lookupByPartNumber(partNumber: string): Promise<PartsFitmentResult> {
    return {
      success: false,
      error: {
        code: 'MANUAL_CATALOG_NOT_CONFIGURED',
        message:
          'Manual parts catalog lookup is enabled but no catalog sync adapter is configured.',
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
          'Manual parts catalog search is stubbed for future integration with tenant-managed fitment data.',
      },
      source: this.name,
    };
  }
}
