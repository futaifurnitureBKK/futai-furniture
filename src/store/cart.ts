import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types";

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number | null;
  hasUnpricedItems: () => boolean;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.product.sku === product.sku
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.sku === product.sku
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity }] };
        });
      },

      removeItem: (sku) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.sku !== sku),
        })),

      updateQuantity: (sku, quantity) => {
        if (quantity <= 0) {
          get().removeItem(sku);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.sku === sku ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () => {
        const items = get().items;
        if (items.some((i) => i.product.price === null)) return null;
        return items.reduce(
          (sum, i) => sum + (i.product.price ?? 0) * i.quantity,
          0
        );
      },

      hasUnpricedItems: () =>
        get().items.some((i) => i.product.price === null),
    }),
    { name: "futai-cart" }
  )
);
