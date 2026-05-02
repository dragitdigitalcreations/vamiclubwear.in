-- Composite index for the storefront product listing hot path.
-- Matches the predicate used by `productService.listProducts`:
--   WHERE "deletedAt" IS NULL AND "isActive" = true
--   ORDER BY "createdAt" DESC
-- CONCURRENTLY would be ideal but Prisma migrate runs each migration inside a
-- transaction which forbids it; the table is small enough today that the
-- exclusive lock during creation is acceptable.
CREATE INDEX IF NOT EXISTS "Product_deletedAt_isActive_createdAt_idx"
  ON "Product"("deletedAt", "isActive", "createdAt" DESC);
