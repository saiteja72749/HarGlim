import { expect, it } from 'vitest';
import { metadataDescription, lastModified } from './seo-data';
it('uses actual text without HTML in search descriptions and does not invent missing copy', () => {
  expect(metadataDescription('<p>Published   description</p>')).toBe('Published description');
  expect(metadataDescription(null)).toBeUndefined();
  expect(metadataDescription('')).toBeUndefined();
});
it('does not invent modification dates for missing or invalid server timestamps', () => {
  expect(lastModified('invalid')).toBeUndefined();
  expect(lastModified(null)).toBeUndefined();
  expect(lastModified('2026-11-21T00:00:00Z')?.toISOString()).toBe('2026-11-21T00:00:00.000Z');
});
