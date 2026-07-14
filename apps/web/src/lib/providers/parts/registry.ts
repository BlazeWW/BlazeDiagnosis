import { ManualPartsCatalogProvider } from './implementations/manualCatalog';
import { MockPartsFitmentProvider } from './implementations/mock';
import { SouthAfricaPartsFitmentProvider } from './implementations/southAfrica';
import type { IPartsFitmentProvider, PartsFitmentResult } from './types';

const partsProviders: IPartsFitmentProvider[] = [];

export function getPartsProviders(): IPartsFitmentProvider[] {
  if (partsProviders.length === 0) {
    const saApiKey = process.env.SA_PARTS_FITMENT_API_KEY;
    const manualEnabled = process.env.MANUAL_PARTS_CATALOG_ENABLED === 'true';

    if (saApiKey) {
      partsProviders.push(new SouthAfricaPartsFitmentProvider(saApiKey));
    }

    if (manualEnabled) {
      partsProviders.push(new ManualPartsCatalogProvider());
    }

    partsProviders.push(new MockPartsFitmentProvider());
    partsProviders.sort((a, b) => a.priority - b.priority);
  }

  return partsProviders;
}

export async function lookupPartNumber(
  partNumber: string,
): Promise<PartsFitmentResult> {
  const providers = getPartsProviders();

  for (const provider of providers) {
    if (!(await provider.isAvailable())) {
      continue;
    }

    const result = await provider.lookupByPartNumber(partNumber);
    if (result.success) {
      return result;
    }
  }

  return {
    success: false,
    error: {
      code: 'ALL_PARTS_PROVIDERS_FAILED',
      message: 'No parts provider returned a successful result.',
    },
    source: 'registry',
  };
}
