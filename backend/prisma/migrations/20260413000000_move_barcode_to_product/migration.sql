-- Move barcode from ProductVariant → Product
-- Drop barcode unique index and column from ProductVariant
DROP INDEX IF EXISTS "ProductVariant_barcode_key";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "barcode";

-- Add barcode column to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode");
