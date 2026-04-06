'use client'

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id:      string
  type:    ToastType
  message: string
}

interface ToastState {
  toasts: Toast[]
  push:   (type: ToastType, message: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push(type, message) {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }))
    // Auto-remove after 4 s
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },

  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

// Convenience helpers
export const toast = {
  success: (msg: string) => useToastStore.getState().push('success', msg),
  error:   (msg: string) => useToastStore.getState().push('error', msg),
  info:    (msg: string) => useToastStore.getState().push('info', msg),
}
