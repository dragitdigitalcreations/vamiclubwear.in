'use client'

import { create } from 'zustand'

export interface FilterState {
  isOpen:      boolean
  category:    string          // '' = all
  sort:        string          // 'newest' | 'price-asc' | 'price-desc'
  priceMin:    string          // '' = no min
  priceMax:    string          // '' = no max

  openFilter:   () => void
  closeFilter:  () => void
  toggleFilter: () => void

  setCategory: (cat: string) => void
  setSort:     (sort: string) => void
  setPriceMin: (v: string) => void
  setPriceMax: (v: string) => void
  reset:       () => void
}

export const useFilterStore = create<FilterState>()((set) => ({
  isOpen:   false,
  category: '',
  sort:     'newest',
  priceMin: '',
  priceMax: '',

  openFilter:   () => set({ isOpen: true }),
  closeFilter:  () => set({ isOpen: false }),
  toggleFilter: () => set((s) => ({ isOpen: !s.isOpen })),

  setCategory: (category) => set({ category }),
  setSort:     (sort)     => set({ sort }),
  setPriceMin: (priceMin) => set({ priceMin }),
  setPriceMax: (priceMax) => set({ priceMax }),

  reset: () => set({ category: '', sort: 'newest', priceMin: '', priceMax: '' }),
}))
