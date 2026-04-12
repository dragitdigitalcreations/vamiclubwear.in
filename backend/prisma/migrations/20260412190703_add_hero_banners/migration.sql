-- DropIndex
DROP INDEX "Inventory_variantId_idx";

-- DropIndex
DROP INDEX "InventoryHistory_variantId_createdAt_idx";

-- DropIndex
DROP INDEX "Order_status_createdAt_idx";

-- DropIndex
DROP INDEX "Product_categoryId_isActive_idx";

-- DropIndex
DROP INDEX "Product_createdAt_idx";

-- DropIndex
DROP INDEX "Product_isFeatured_isActive_idx";

-- CreateTable
CREATE TABLE "HeroBanner" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "eyebrow" TEXT,
    "titleLine1" TEXT,
    "titleLine2" TEXT,
    "subtitle" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#8B6B47',
    "darkTheme" BOOLEAN NOT NULL DEFAULT false,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "ctaAltLabel" TEXT,
    "ctaAltHref" TEXT,
    "imageDesktop" TEXT,
    "imageTablet" TEXT,
    "imageMobile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroBanner_isActive_idx" ON "HeroBanner"("isActive");

-- CreateIndex
CREATE INDEX "HeroBanner_sortOrder_idx" ON "HeroBanner"("sortOrder");
