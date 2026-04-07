-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('NOT_CREATED', 'CREATED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'CREATED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "awbNumber" TEXT,
ADD COLUMN     "delhiveryShipmentId" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoicePdfUrl" TEXT,
ADD COLUMN     "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "shippingStatus" "ShippingStatus" NOT NULL DEFAULT 'NOT_CREATED',
ADD COLUMN     "trackingUrl" TEXT;

-- CreateIndex
CREATE INDEX "Order_awbNumber_idx" ON "Order"("awbNumber");
