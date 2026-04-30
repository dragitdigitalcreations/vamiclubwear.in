-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'DELIVERY',
                   ADD COLUMN     "pickupReadyAt" TIMESTAMP(3),
                   ADD COLUMN     "pickedUpAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_fulfillmentType_idx" ON "Order"("fulfillmentType");
