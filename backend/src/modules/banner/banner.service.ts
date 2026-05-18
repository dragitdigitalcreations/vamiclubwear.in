import { prisma } from '../../lib/prisma'
import { cache } from '../../lib/cache'

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

const ACTIVE_KEY = 'banners:active'

function bust() {
  cache.del(ACTIVE_KEY).catch(() => {})
}

export const bannerService = {
  // Public: active banners ordered by sortOrder (used by storefront carousel)
  listActive() {
    return cache.wrap(
      ACTIVE_KEY,
      () => prisma.heroBanner.findMany({
        where:   { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      300,
    )
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

  async create(data: UpsertBannerInput) {
    const row = await prisma.heroBanner.create({ data })
    bust()
    return row
  },

  async update(id: string, data: UpsertBannerInput) {
    const row = await prisma.heroBanner.update({ where: { id }, data })
    bust()
    return row
  },

  async delete(id: string) {
    const row = await prisma.heroBanner.delete({ where: { id } })
    bust()
    return row
  },
}
