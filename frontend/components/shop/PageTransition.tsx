'use client'

import { motion } from 'framer-motion'

/**
 * Wraps page content in a subtle fade + slight upward translate.
 * 250ms duration keeps it premium without feeling slow.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
