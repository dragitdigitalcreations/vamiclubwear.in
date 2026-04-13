'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from '@/types/product'

interface CartState {
  items: CartItem[]
  isOpen: boolean

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, delta: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void

  // Computed (as getters via selectors)
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId)
          const max = typeof item.stock === 'number' ? item.stock : Infinity
          if (existing) {
            const newQty = Math.min(existing.quantity + 1, max)
            return {
              isOpen: true,
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: newQty } : i
              ),
            }
          }
          return { isOpen: true, items: [...state.items, { ...item, quantity: 1 }] }
        })
      },

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQuantity: (variantId, delta) =>
        set((state) => ({
          items: state.items
            .map((i) => {
              if (i.variantId !== variantId) return i
              const max = typeof i.stock === 'number' ? i.stock : Infinity
              return { ...i, quantity: Math.min(Math.max(1, i.quantity + delta), max) }
            })
            .filter((i) => i.quantity > 0),
        })),

      clearCart: () => set({ items: [] }),
      openCart:  () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: 'vami-cart',
      // Don't persist the drawer-open state
      partialize: (state) => ({ items: state.items }),
    }
  )
)

// Derived selectors (use outside the store to avoid re-render storms)
export const selectTotalItems = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0)

export const selectSubtotal = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
