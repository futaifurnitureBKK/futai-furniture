import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemColor, Product } from "@/types";

// A cart line is identified by SKU + chosen color + chosen seat count (no
// color/seats = base product), so picking different variants of the same
// product yields separate lines.
function sameLine(item: CartItem, sku: string, colorLabelTh?: string, seats?: number) {
  return item.product.sku === sku && item.color?.label_th === colorLabelTh && item.seats === seats;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, color?: CartItemColor, seats?: number) => void;
  removeItem: (sku: string, colorLabelTh?: string, seats?: number) => void;
  updateQuantity: (sku: string, quantity: number, colorLabelTh?: string, seats?: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number | null;
  hasUnpricedItems: () => boolean;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, color, seats) => {
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, product.sku, color?.label_th, seats));
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity, color, seats }] };
        });
      },

      removeItem: (sku, colorLabelTh, seats) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, sku, colorLabelTh, seats)),
        })),

      updateQuantity: (sku, quantity, colorLabelTh, seats) => {
        if (quantity <= 0) {
          get().removeItem(sku, colorLabelTh, seats);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, sku, colorLabelTh, seats) ? { ...i, quantity } : i
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
