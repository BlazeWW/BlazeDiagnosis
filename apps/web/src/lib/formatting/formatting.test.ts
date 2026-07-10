import { describe, expect, it } from 'vitest';

import { formatDateTime } from './dates';
import { formatMoney } from './money';

describe('formatting helpers', () => {
  it('formats money using South African defaults', () => {
    const formatted = formatMoney(1234.56);

    expect(formatted).toContain('R');
    expect(formatted).toContain('1');
  });

  it('formats dates in the supplied timezone and locale', () => {
    expect(
      formatDateTime('2026-07-02T08:00:00.000Z', 'en-ZA', 'Africa/Johannesburg'),
    ).toContain('2026');
  });
});
