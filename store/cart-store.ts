import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Book {
  _id: string;
  title: string;
  slug: string;
  author: { _id: string; name: string; email?: string } | string;
  category: { _id: string; name: string; slug: string } | string;
  description: string;
  coverImage: string;
  price: number;
  discountPrice?: number;
  mrp?: number;
  format: string;
  rating?: number;
  totalReviews?: number;
  totalSales?: number;
  isBestseller?: boolean;
  isNewRelease?: boolean;
  isFeatured?: boolean;
}

export interface CartItem {
  book: Book;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (book: Book, quantity?: number) => void;
  removeItem: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getShipping: () => number;
  getTotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set: any, get: any): CartState => ({
      items: [],
      
      addItem: (book: Book, quantity: number = 1) => {
        set((state: CartState) => {
          const existingItem = state.items.find((item: CartItem) => item.book._id === book._id);
          if (existingItem) {
            return {
              items: state.items.map((item: CartItem) =>
                item.book._id === book._id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            };
          }
          return { items: [...state.items, { book, quantity }] };
        });
      },
      
      removeItem: (bookId: string) => {
        set((state: CartState) => ({
          items: state.items.filter((item: CartItem) => item.book._id !== bookId)
        }));
      },
      
      updateQuantity: (bookId: string, quantity: number) => {
        set((state: CartState) => ({
          items: state.items.map((item: CartItem) =>
            item.book._id === bookId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          )
        }));
      },
      
      clearCart: () => set({ items: [] }),
      
      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total: number, item: CartItem) => {
          const prices = [item.book.price, item.book.discountPrice, item.book.mrp];
          const price = prices.find((value) => typeof value === 'number' && Number.isFinite(value)) ?? 0;
          return total + (price * item.quantity);
        }, 0);
      },
      
      getTax: () => 0,
      
      getShipping: () => 0,
      
      getTotal: () => {
        const totalAmount = get().getSubtotal() + get().getShipping();
        return parseFloat(totalAmount.toFixed(2));
      },
      
      itemCount: () => {
        return get().items.reduce((total: number, item: CartItem) => total + item.quantity, 0);
      }
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
