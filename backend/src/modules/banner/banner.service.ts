import { prisma } from '../../lib/prisma'

export interface UpsertBannerInput {
  sortOrder?:   number
  isActive?:    boolean
  eyebrow?:     string
  titleLine1?:  string
  titleLine2?:  string
  subtitle?:    string
  accentColor?: string
  darkTheme?:   boolean
  ctaLabel?:    string
  ctaHref?:     string
  ctaAltLabel?: string
  ctaAltHref?:  string
  imageDesktop?: string
  imageTablet?:  string
  imageMobile?:  string
}

export const bannerService = {
  // Public: active banners ordered by sortOrder (used by storefront carousel)
  listActive() {
    return prisma.heroBanner.findMany({
      where:   { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
  },

  // Admin: all banners
  listAll() {
    return prisma.heroBanner.findMany({
      orderBy: { sortOrder: 'asc' },
    })
  },

  getById(id: string) {
    return prisma.heroBanner.findUniqueOrThrow({ where: { id } })
  },

  create(data: UpsertBannerInput) {
    return prisma.heroBanner.create({ data })
  },

  update(id: string, data: UpsertBannerInput) {
    return prisma.heroBanner.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.heroBanner.delete({ where: { id } })
  },
}
