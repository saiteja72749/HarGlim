import { describe, expect, it } from 'vitest';
import { bookPresentation, publishedNumber } from './book-presentation';

describe('published book values', () => {
  it('does not treat an MRP-only record as a confirmed selling price', () => {
    expect(bookPresentation({ mrp: 100 } as Parameters<typeof bookPresentation>[0]).price).toBeNull();
  });
  it('does not turn missing, blank or boolean fields into free prices', () => {
    for (const input of [undefined, null, '', ' ', true, false, -1, NaN]) expect(publishedNumber(input)).toBeNull();
    expect(publishedNumber(0)).toBe(0);
  });
  it('preserves real zero values and stock reservations', () => {
    const result = bookPresentation({ price: 0, mrp: 100, ratings: 0, rating: 5, reviewCount: 0, stock: 3, reservedStock: 3 });
    expect(result).toMatchObject({ price: 0, rating: 0, reviewCount: 0, outOfStock: true });
  });
});
