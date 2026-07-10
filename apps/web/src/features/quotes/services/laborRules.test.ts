import { describe, expect, it } from 'vitest';

import {
  calculateApprovedQuoteTotals,
  type QuoteLineItemForCalculation,
} from './laborRules';

let idCounter = 0;
const nextId = () => `line-${++idCounter}`;

const part = (
  overrides: Partial<QuoteLineItemForCalculation> = {},
): QuoteLineItemForCalculation => ({
  approvalStatus: 'approved',
  category: 'part',
  discount: 0,
  id: nextId(),
  quantity: 1,
  taxRate: 15,
  unitPrice: 100,
  ...overrides,
});

const labor = (
  overrides: Partial<QuoteLineItemForCalculation> = {},
): QuoteLineItemForCalculation => ({
  approvalStatus: 'not_required',
  category: 'labor',
  discount: 0,
  id: nextId(),
  quantity: 1,
  taxRate: 15,
  unitPrice: 300,
  ...overrides,
});

describe('calculateApprovedQuoteTotals', () => {
  it('includes approved and not-required items in the billable result', () => {
    const result = calculateApprovedQuoteTotals([
      part({ id: 'pads' }),
      labor({ id: 'diagnostic-labor' }),
      part({ approvalStatus: 'declined', id: 'discs' }),
    ]);

    expect(result.approvedItems.map((item) => item.id)).toEqual([
      'pads',
      'diagnostic-labor',
    ]);
    expect(result.total).toBe(460);
  });

  it('removes labor that depends on a declined dependency group', () => {
    const result = calculateApprovedQuoteTotals([
      part({ approvalStatus: 'declined', dependencyGroupId: 'front-brakes', id: 'discs' }),
      labor({
        id: 'brake-labor',
        laborRule: {
          dependencyGroupId: 'front-brakes',
          type: 'requires_approved_dependency',
        },
      }),
    ]);

    expect(result.approvedItems).toHaveLength(0);
    expect(result.removedLaborItems.map((item) => item.id)).toEqual(['brake-labor']);
    expect(result.total).toBe(0);
  });

  it('charges shared labor only once per approved dependency group', () => {
    const result = calculateApprovedQuoteTotals([
      part({ dependencyGroupId: 'front-brakes', id: 'pads' }),
      part({ dependencyGroupId: 'front-brakes', id: 'sensors' }),
      labor({
        id: 'shared-labor-1',
        laborRule: {
          dependencyGroupId: 'front-brakes',
          type: 'shared_once_per_group',
        },
      }),
      labor({
        id: 'shared-labor-2',
        laborRule: {
          dependencyGroupId: 'front-brakes',
          type: 'shared_once_per_group',
        },
      }),
    ]);

    expect(result.approvedItems.map((item) => item.id)).toEqual([
      'pads',
      'sensors',
      'shared-labor-1',
    ]);
    expect(result.removedLaborItems.map((item) => item.id)).toEqual([
      'shared-labor-2',
    ]);
  });
});
