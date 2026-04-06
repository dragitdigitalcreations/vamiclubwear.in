'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

const ICONS = {
  success: <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />,
  error:   <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />,
  info:    <Info        className="h-4 w-4 text-blue-400 flex-shrink-0" />,
}

export function Toaster() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed bottom-6 right-4 z-[100] flex flex-col gap-2 md:right-6">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-[320px] items-start gap-3 border border-border bg-surface px-4 py-3 shadow-lg"
          >
            {ICONS[t.type]}
            <p className="flex-1 text-sm text-on-background leading-snug">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-muted hover:text-on-background transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
