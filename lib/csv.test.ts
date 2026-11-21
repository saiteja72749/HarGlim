// @vitest-environment node
import { expect, it } from 'vitest';
import { csvCell } from './csv';
it('neutralizes formulas from exported book titles while preserving numeric values', () => {
  expect(csvCell('=HYPERLINK("https://example.com")')).toBe('"\'=HYPERLINK(""https://example.com"")"');
  expect(csvCell('  @SUM(1,2)')).toBe('"\'  @SUM(1,2)"');
  expect(csvCell(-10)).toBe('"-10"');
  expect(csvCell('A, "B"')).toBe('"A, ""B"""');
});
