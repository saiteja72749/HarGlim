import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

import type { Book, CartItem } from '@/types';
import { getCartUnitPrice } from '@/lib/book-presentation';
export type { Book, CartItem } from '@/types';

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

export const createCartStore = (getStorage: () => StateStorage = () => window.localStorage) => create<CartState>()(
  persist(
    (set, get): CartState => ({
      items: [],
      
      addItem: (book: Book, quantity: number = 1) => {
        if (!book._id || !Number.isSafeInteger(quantity) || quantity < 1) return;
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
          const price = getCartUnitPrice(item.book) ?? 0;
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
      storage: createJSONStorage(getStorage),
    }
  )
);

export const useCartStore = createCartStore();
