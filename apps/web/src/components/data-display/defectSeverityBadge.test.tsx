
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DefectSeverityBadge } from './defectSeverityBadge';

describe('DefectSeverityBadge', () => {
  it('displays normal severity', () => {
    const markup = renderToStaticMarkup(
      <DefectSeverityBadge severity="normal" />,
    );

    expect(markup).toContain('Normal');
  });

  it('displays advisory severity', () => {
    const markup = renderToStaticMarkup(
      <DefectSeverityBadge severity="advisory" />,
    );

    expect(markup).toContain('Advisory');
  });

  it('displays critical severity', () => {
    const markup = renderToStaticMarkup(
      <DefectSeverityBadge severity="critical" />,
    );

    expect(markup).toContain('Critical');
  });

  it('handles unsupported severity safely', () => {
    const markup = renderToStaticMarkup(
      <DefectSeverityBadge severity="unknown-value" />,
    );

    expect(markup).toContain('Unknown severity');
    expect(markup).not.toContain('Normal');
  });
});
