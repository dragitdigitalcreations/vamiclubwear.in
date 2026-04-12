-- Add optional barcode field to ProductVariant for physical POS scanning
ALTER TABLE "ProductVariant" ADD COLUMN "barcode" TEXT;
CREATE UNIQUE INDEX "ProductVariant_barcode_key" ON "ProductVariant"("barcode");
