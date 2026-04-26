-- Per-colour barcode support: a product can either use a single barcode for the
-- whole product (existing Product.barcode) or one barcode per colour bundle —
-- shared by all sizes of that colour — stored in ProductColorBarcode.

ALTER TABLE "Product"
  ADD COLUMN "perColorBarcode" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ProductColorBarcode" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "color"     TEXT NOT NULL,
  "barcode"   TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductColorBarcode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductColorBarcode_barcode_key"
  ON "ProductColorBarcode"("barcode");

CREATE UNIQUE INDEX "ProductColorBarcode_productId_color_key"
  ON "ProductColorBarcode"("productId", "color");

CREATE INDEX "ProductColorBarcode_productId_idx"
  ON "ProductColorBarcode"("productId");

CREATE INDEX "ProductColorBarcode_barcode_idx"
  ON "ProductColorBarcode"("barcode");

ALTER TABLE "ProductColorBarcode"
  ADD CONSTRAINT "ProductColorBarcode_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
