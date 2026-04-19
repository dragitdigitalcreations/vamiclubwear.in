-- Add soft-delete support to products.
-- Products with order history cannot be hard-deleted (OrderItem.variantId FK is Restrict),
-- so deleteProduct() archives them with deletedAt + suffixed slug/barcode to free the uniques.

ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");
