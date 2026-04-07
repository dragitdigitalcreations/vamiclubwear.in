'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Eye } from 'lucide-react'
import { Product, getPrimaryImage, getVariantsByColor } from '@/types/product'
import { useCartStore } from '@/stores/cartStore'

interface ProductCardProps {
  product: Product
  priority?: boolean
}

function isNewProduct(createdAt?: string): boolean {
  if (!createdAt) return false
  return Date.now() - new Date(createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [hovered,    setHovered]    = useState(false)
  const [addedPulse, setAddedPulse] = useState(false)
  const { addItem } = useCartStore()

  const imageUrl = getPrimaryImage(product)
  const colors   = getVariantsByColor(product.variants)

  const defaultVariant = product.variants
    .filter((v) => v.isActive)
    .sort((a, b) => a.price - b.price)[0]

  const isNew = isNewProduct(product.createdAt)

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (!defaultVariant) return
    addItem({
      variantId:   defaultVariant.id,
      productId:   product.id,
      productName: product.name,
      productSlug: product.slug,
      sku:         defaultVariant.sku,
      size:        defaultVariant.size,
      color:       defaultVariant.color,
      colorHex:    defaultVariant.colorHex,
      price:       Number(defaultVariant.price),
      imageUrl,
    })
    setAddedPulse(true)
    setTimeout(() => setAddedPulse(false), 1200)
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-surface-elevated aspect-[3/4]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            priority={priority}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ShoppingBag className="h-10 w-10 opacity-20" />
          </div>
        )}

        {/* Badges — top-left stack */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {isNew && (
            <span className="bg-on-background px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-background">
              New
            </span>
          )}
          {product.isFeatured && (
            <span className="bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
              Featured
            </span>
          )}
        </div>

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 flex items-end gap-2 bg-black/25 p-3"
            >
              {/* Quick add */}
              {defaultVariant && (
                <motion.button
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 10, opacity: 0 }}
                  transition={{ delay: 0.03 }}
                  onClick={handleQuickAdd}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                    addedPulse
                      ? 'bg-green-700 text-white'
                      : 'bg-surface/90 text-on-background hover:bg-primary hover:text-white'
                  }`}
                  aria-label="Quick add to cart"
                >
                  <ShoppingBag className="h-3 w-3" />
                  {addedPulse ? 'Added ✓' : 'Quick Add'}
                </motion.button>
              )}

              {/* View */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ delay: 0.06 }}
                className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center bg-surface/90 transition-colors hover:bg-primary"
              >
                <Eye className="h-3.5 w-3.5 text-on-background" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="mt-3 px-0.5">
        {/* Color swatches */}
        {colors.length > 0 && (
          <div className="mb-2 flex items-center gap-1.5">
            {colors.slice(0, 5).map((c) => (
              <span
                key={c.color}
                title={c.color}
                className="h-2.5 w-2.5 rounded-full border border-border/50"
                style={{ backgroundColor: c.colorHex ?? '#888' }}
              />
            ))}
            {colors.length > 5 && (
              <span className="text-[10px] text-muted">+{colors.length - 5}</span>
            )}
          </div>
        )}

        <h3 className="text-sm font-medium leading-snug text-on-background line-clamp-2 transition-colors group-hover:text-primary-light">
          {product.name}
        </h3>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">{product.category.name}</p>
        <p className="mt-1.5 text-sm font-semibold text-on-background">
          ₹{Number(product.basePrice).toLocaleString('en-IN')}
        </p>
      </div>
    </Link>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[3/4] w-full" />
      <div className="mt-3 space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-1/4" />
      </div>
    </div>
  )
}
