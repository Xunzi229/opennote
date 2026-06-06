import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/index.css', 'utf8');

describe('global CSS contracts', () => {
  it('keeps search input padding scoped above the generic input field', () => {
    expect(css).toContain('.workspace-command .command-input');
    expect(css).toContain('padding-left: 34px;');
    expect(css).toContain('padding-right: 12px;');
  });
});
