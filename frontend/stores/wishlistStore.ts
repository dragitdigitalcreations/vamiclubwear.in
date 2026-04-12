'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WishlistItem {
  id:        string
  name:      string
  slug:      string
  basePrice: number
  imageUrl:  string | null
  category:  string
}

interface WishlistState {
  items:          WishlistItem[]
  isOpen:         boolean
  toggleItem:     (item: WishlistItem) => void
  removeItem:     (id: string) => void
  isWishlisted:   (id: string) => boolean
  openWishlist:   () => void
  closeWishlist:  () => void
  toggleWishlist: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items:  [],
      isOpen: false,

      toggleItem: (item) =>
        set((s) =>
          s.items.some((i) => i.id === item.id)
            ? { items: s.items.filter((i) => i.id !== item.id) }
            : { items: [...s.items, item] }
        ),

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      isWishlisted: (id) => get().items.some((i) => i.id === id),

      openWishlist:   () => set({ isOpen: true }),
      closeWishlist:  () => set({ isOpen: false }),
      toggleWishlist: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name:       'vami-wishlist',
      partialize: (s) => ({ items: s.items }),
    }
  )
)

export const selectWishlistCount = (s: WishlistState) => s.items.length
