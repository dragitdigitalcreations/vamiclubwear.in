-- Add GIN full-text search index on Product(name, description) for fast search
-- Add composite indexes used in product listing queries

-- Full-text search index
CREATE INDEX IF NOT EXISTS "Product_search_idx"
  ON "Product" USING GIN (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
  );

-- Fast category-filtered active product queries
CREATE INDEX IF NOT EXISTS "Product_categoryId_isActive_idx"
  ON "Product"("categoryId", "isActive");

-- Fast featured + active homepage queries
CREATE INDEX IF NOT EXISTS "Product_isFeatured_isActive_idx"
  ON "Product"("isFeatured", "isActive");

-- createdAt for "newest first" sort
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx"
  ON "Product"("createdAt" DESC);

-- Inventory: fast lookup by variant
CREATE INDEX IF NOT EXISTS "Inventory_variantId_idx"
  ON "Inventory"("variantId");

-- Order lookup by status
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx"
  ON "Order"("status", "createdAt" DESC);

-- Inventory history audit trail
CREATE INDEX IF NOT EXISTS "InventoryHistory_variantId_createdAt_idx"
  ON "InventoryHistory"("variantId", "createdAt" DESC);
