// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createCartStore, type Book } from './cart-store';

const useCartStore = createCartStore(() => localStorage);

const makeBook = (overrides: Partial<Book> = {}): Book => ({
  _id: 'book-1',
  title: 'The Art of Programming',
  slug: 'the-art-of-programming',
  author: { _id: 'author-1', name: 'Ada Lovelace' },
  category: { _id: 'cat-1', name: 'Technology', slug: 'technology' },
  description: 'A book about programming.',
  coverImage: '/placeholder-book.svg',
  price: 499,
  format: 'Paperback',
  ...overrides,
});

beforeEach(() => {
  useCartStore.setState({ items: [] });
  localStorage.clear();
});

describe('cart-store', () => {
  it('adds a new book with default quantity 1', () => {
    useCartStore.getState().addItem(makeBook());
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
  });

  it('merges quantity when the same book is added again', () => {
    const book = makeBook();
    useCartStore.getState().addItem(book, 2);
    useCartStore.getState().addItem(book, 3);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it('keeps distinct books as separate line items', () => {
    useCartStore.getState().addItem(makeBook({ _id: 'book-1' }));
    useCartStore.getState().addItem(makeBook({ _id: 'book-2', title: 'Business Strategy 101' }));
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('removes a book by id', () => {
    useCartStore.getState().addItem(makeBook({ _id: 'book-1' }));
    useCartStore.getState().addItem(makeBook({ _id: 'book-2' }));
    useCartStore.getState().removeItem('book-1');
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].book._id).toBe('book-2');
  });

  it('updates quantity but never below 1', () => {
    useCartStore.getState().addItem(makeBook());
    useCartStore.getState().updateQuantity('book-1', 5);
    expect(useCartStore.getState().items[0].quantity).toBe(5);

    useCartStore.getState().updateQuantity('book-1', 0);
    expect(useCartStore.getState().items[0].quantity).toBe(1);

    useCartStore.getState().updateQuantity('book-1', -3);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('clears the cart', () => {
    useCartStore.getState().addItem(makeBook());
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('computes subtotal as price × quantity, summed across items', () => {
    useCartStore.getState().addItem(makeBook({ _id: 'book-1', price: 499 }), 2);
    useCartStore.getState().addItem(makeBook({ _id: 'book-2', price: 299 }), 1);
    expect(useCartStore.getState().getSubtotal()).toBe(499 * 2 + 299);
  });

  it('falls back to discountPrice or mrp when price is missing', () => {
    useCartStore.getState().addItem(
      makeBook({ _id: 'book-1', price: undefined, discountPrice: 350 })
    );
    expect(useCartStore.getState().getSubtotal()).toBe(350);
  });

  it('total equals subtotal plus shipping (shipping is currently free)', () => {
    useCartStore.getState().addItem(makeBook({ price: 499 }), 3);
    const state = useCartStore.getState();
    expect(state.getTotal()).toBe(state.getSubtotal());
    expect(state.getShipping()).toBe(0);
  });

  it('itemCount sums quantities across all line items', () => {
    useCartStore.getState().addItem(makeBook({ _id: 'book-1' }), 2);
    useCartStore.getState().addItem(makeBook({ _id: 'book-2' }), 3);
    expect(useCartStore.getState().itemCount()).toBe(5);
  });
});
