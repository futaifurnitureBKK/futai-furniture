import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemColor, Product } from "@/types";

// A cart line is identified by SKU + chosen color (no color = base product),
// so picking two different colors of the same product yields two separate lines.
function sameLine(item: CartItem, sku: string, colorLabelTh?: string) {
  return item.product.sku === sku && item.color?.label_th === colorLabelTh;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, color?: CartItemColor) => void;
  removeItem: (sku: string, colorLabelTh?: string) => void;
  updateQuantity: (sku: string, quantity: number, colorLabelTh?: string) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number | null;
  hasUnpricedItems: () => boolean;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, color) => {
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, product.sku, color?.label_th));
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity, color }] };
        });
      },

      removeItem: (sku, colorLabelTh) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, sku, colorLabelTh)),
        })),

      updateQuantity: (sku, quantity, colorLabelTh) => {
        if (quantity <= 0) {
          get().removeItem(sku, colorLabelTh);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, sku, colorLabelTh) ? { ...i, quantity } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      // Pricing is hidden storefront-wide (quote-only model) — always report
      // "unpriced" regardless of what's on the product record.
      subtotal: () => null,

      hasUnpricedItems: () => true,
    }),
    { name: "futai-cart" }
  )
);
